import WebSocket from "ws";
import { EventEmitter } from 'events';
import { first, last } from 'random-name';
import World from "./world";

export enum BlockDirection { FORWARD, UP, DOWN }
export enum Direction { NORTH, EAST, SOUTH, WEST }
export enum Side { LEFT, RIGHT }

interface Slot {
	count: number;
	name: string;
	damage: number;
}

export class Turtle extends EventEmitter {

	id: number = 0;
	label: string = '';
	fuel: number = 0;
	maxFuel: number = 1;
	selectedSlot: number = 1;
	inventory: (Slot | null)[] = [];
	ws: WebSocket;
	world: World;
	x: number = 0;
	y: number = 0;
	z: number = 0;
	d: Direction = 0;

	constructor(ws: WebSocket, world: World) {
		super();
		this.world = world;
		this.ws = ws;
		this.exec<string>('os.getComputerLabel()').then(async label => {
			if (label) {
				this.label = label;
			} else {
				this.label = first() + ' ' + last();
				await this.exec(`os.setComputerLabel("${this.label}")`);
			}
			this.id = await this.exec<number>('os.getComputerID()');
			[this.x, this.y, this.z, this.d] = this.world.getTurtle(this);
			this.selectedSlot = await this.exec<number>('turtle.getSelectedSlot()');
			this.maxFuel = await this.exec<number>('turtle.getFuelLimit()');
			this.fuel = await this.exec<number>('turtle.getFuelLevel()');
			await this.updateFuel();
			this.updateInventory();
			this.emit('init');
		});
	}

	toJSON(): object {
		return {
			label: this.label,
			inventory: this.inventory,
			selectedSlot: this.selectedSlot,
			x: this.x,
			y: this.y,
			z: this.z,
			d: this.d,
			fuel: this.fuel,
			maxFuel: this.maxFuel,
			id: this.id
		};
	}

	exec<T>(command: string): Promise<T> {
		return new Promise(r => {
			this.ws.send(JSON.stringify({
				type: 'eval',
				function: `return ${command}`
			}));

			this.ws.once('message', (resp: string) => {
				let res = JSON.parse(resp);
				if (res === 'null') res = null;
				r(res);
			});
		});
	}


	async forward(): Promise<boolean> {
		let r = await this.exec<boolean>('turtle.forward()');
		if (r) {
			this.fuel--;
			await this.updatePosition('forward');
		}
		return r;
	}
	async back(): Promise<boolean> {
		let r = await this.exec<boolean>('turtle.back()');
		if (r) {
			this.fuel--;
			await this.updatePosition('back');
		}
		return r;
	}
	async up(): Promise<boolean> {
		let r = await this.exec<boolean>('turtle.up()');
		if (r) {
			this.fuel--;
			await this.updatePosition('up');
		}
		return r;
	}
	async down(): Promise<boolean> {
		let r = await this.exec<boolean>('turtle.down()');
		if (r) {
			this.fuel--;
			await this.updatePosition('down');
		}
		return r;
	}
	async turnLeft(): Promise<boolean> {
		let r = await this.exec<boolean>('turtle.turnLeft()');
		if (r) {
			await this.updatePosition('left');
		}
		return r;
	}
	async turnRight(): Promise<boolean> {
		let r = await this.exec<boolean>('turtle.turnRight()');
		if (r) {
			await this.updatePosition('right');
		}
		return r;
	}

	private parseDirection(prefix: string, direction: BlockDirection): string {
		switch (direction) {
			case BlockDirection.FORWARD:
				return prefix;
			case BlockDirection.UP:
				return prefix + 'Up';
			case BlockDirection.DOWN:
				return prefix + 'Down';
		}
	}

	private async updateInventory() {
		this.inventory = await this.exec<Slot[]>('{' + new Array(16).fill(0).map((_, i) => `turtle.getItemDetail(${i + 1})`).join(', ') + '}');
		while (this.inventory.length < 16) {
			this.inventory.push(null);
		}
		this.emit('update');
	}

	private async updateFuel() {
		this.emit('update');
	}

	private getDirectionDelta(dir: Direction): [number, number] {
		if (dir === Direction.NORTH) return [0, -1];
		else if (dir === Direction.EAST) return [1, 0];
		else if (dir === Direction.SOUTH) return [0, 1];
		else if (dir === Direction.WEST) return [-1, 0];
		return [0, 0];
	}

	private async updatePosition(move: string) {
		let deltas = this.getDirectionDelta(this.d);
		switch (move) {
			case 'up':
				this.y++;
				break;
			case 'down':
				this.y--;
				break;
			case 'forward':
				this.x += deltas[0];
				this.z += deltas[1];
				break;
			case 'back':
				this.x -= deltas[0];
				this.z -= deltas[1];
				break;
			case 'left':
				this.d += 3;
				this.d %= 4;
				break;
			case 'right':
				this.d++;
				this.d %= 4;
				break;
		}
		this.world.updateTurtle(this, this.x, this.y, this.z, this.d);
		await this.updateBlock();
		this.emit('update');
	}

	private async updateBlock() {
		let deltas = this.getDirectionDelta(this.d);
		let { forward, up, down } = await this.exec<{ forward: any, up: any, down: any }>('{down=select(2,turtle.inspectDown()), up=select(2,turtle.inspectUp()), forward=select(2,turtle.inspect())}');
		this.world.updateBlock(this.x, this.y - 1, this.z, down);
		this.world.updateBlock(this.x, this.y + 1, this.z, up);
		this.world.updateBlock(this.x + deltas[0], this.y, this.z + deltas[1], forward);
	}

	async dig(direction: BlockDirection) {
		let r = await this.exec<boolean>(`turtle.${this.parseDirection('dig', direction)}()`);
		await this.updateInventory();
		await this.updateBlock();
		return r;
	}
	async place(direction: BlockDirection, signText?: string) {
		let r = await this.exec<boolean>(`turtle.${this.parseDirection('place', direction)}(${signText ? ('"' + signText + '"') : ''})`);
		await this.updateInventory();
		await this.updateBlock();
		return r;
	}
	async dropItem(direction: BlockDirection, count?: number) {
		let r = await this.exec<boolean>(`turtle.${this.parseDirection('drop', direction)}(${(typeof count === 'number') ? count.toString() : ''})`);
		await this.updateInventory();
		return r;
	}
	async suckItem(direction: BlockDirection, count?: number) {
		let r = await this.exec<boolean>(`turtle.${this.parseDirection('suck', direction)}(${(typeof count === 'number') ? count.toString() : ''})`);
		await this.updateInventory();
		return r;
	}
	async refuel(count?: number) {
		let r = await this.exec<boolean>(`turtle.refuel(${(typeof count === 'number') ? count.toString() : ''})`);
		this.fuel = await this.exec<number>('turtle.getFuelLevel()');
		await this.updateInventory();
		return r;
	}
	async selectSlot(slot: number) {
		if (slot > 0 && slot < 17) {
			this.selectedSlot = slot;
			let r = await this.exec<boolean>(`turtle.select(${slot})`);
			this.emit('update');
			return r;
		}
		return false;
	}
	async refresh() {
		await this.updateInventory();
		await this.updateBlock();
		this.selectedSlot = await this.exec<number>('turtle.getSelectedSlot()');
		this.maxFuel = await this.exec<number>('turtle.getFuelLimit()');
		this.fuel = await this.exec<number>('turtle.getFuelLevel()');
	}
	undergoMitosis(): Promise<number | null> {
		return new Promise(r => {
			this.ws.send(JSON.stringify({
				type: 'mitosis'
			}));

			this.ws.once('message', async (resp: string) => {
				let res: number | null = JSON.parse(resp);
				if ((res as any) === 'null') res = null;
				if (res !== null) {
					let deltas = this.getDirectionDelta(this.d);
					this.world.db.push(`/turtles/${res}`, [this.x + deltas[0], this.y + 1, this.z + deltas[1], this.d]);
				}
				await this.updateInventory();
				await this.updateBlock();
				this.fuel = await this.exec<number>('turtle.getFuelLevel()');
				r(res);
			});
		});
	}
}
