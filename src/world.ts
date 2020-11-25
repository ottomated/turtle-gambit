import { JsonDB } from 'node-json-db';
import { Direction, Turtle } from './turtle';
import { EventEmitter } from 'events';

export default class World extends EventEmitter {
	db: JsonDB;
	constructor() {
		super();
		this.db = new JsonDB('world.json');
		if (!this.db.exists('/world')) this.db.push('/world', {});
		if (!this.db.exists('/nameindex')) this.db.push('/nameindex', 0);
		this.emit('update', this.getAllBlocks());
	}

	updateTurtle(turtle: Turtle, x: number, y: number, z: number, d: Direction) {
		this.db.push(`/turtles/${turtle.id}`, [x, y, z, d]);
	}

	getTurtle(turtle: Turtle): [number, number, number, Direction] {
		let dataPath = `/turtles/${turtle.id}`;
		if (this.db.exists(dataPath))
			return this.db.getData(dataPath);
		else return [0, 0, 0, 0];
	}

	updateBlock(x: number, y: number, z: number, block: any) {
		let dataPath = `/world/${x},${y},${z}`;
		if (block === 'No block to inspect') {
			if (this.db.exists(dataPath)) {
				this.db.delete(dataPath);
				this.emit('update', this.getAllBlocks());
			}
			return;
		}
		this.db.push(dataPath, block);
		this.emit('update', this.getAllBlocks());
	}

	getBlock(x: number, y: number, z: number): any {
		return this.db.getData(`/world/${x},${y},${z}`);
	}
	getAllBlocks(): { [index: string]: any } {
		return this.db.getData('/world');
	}
}