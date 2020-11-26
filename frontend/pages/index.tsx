// import Link from 'next/link';
import React, { createContext, Dispatch, SetStateAction, useEffect, useState } from 'react';
import TurtlePage from '../components/Turtle';
import { EventEmitter } from 'events';
import WorldRenderer from '../components/World';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(() => ({
	root: {
		width: '100vw',
		height: '100vh',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},
	world: {
		width: '100%',
		height: 'calc(100% - 100px)'
	},
}));

interface MyWindow extends Window {
	exec<T>(index: number, code: string, ...args: any[]): Promise<T>;
	refreshData(): void;
	setWorld: Function;
	setTurtles: Function;
}

declare var window: MyWindow;

export enum BlockDirection { FORWARD, UP, DOWN }
export enum Direction { NORTH, EAST, SOUTH, WEST }
export enum Side { LEFT, RIGHT }

interface Slot {
	count: number;
	name: string;
	damage: number;
}

export class Turtle extends EventEmitter {
	inventory: Slot[];
	selectedSlot: number;
	x: number;
	y: number;
	z: number;
	d: Direction;
	label: string;
	fuel: number;
	maxFuel: number;
	id: number;

	constructor(json: any) {
		super();
		this.inventory = json.inventory;
		this.selectedSlot = json.selectedSlot;
		this.x = json.x;
		this.y = json.y;
		this.z = json.z;
		this.d = json.d;
		this.fuel = json.fuel;
		this.maxFuel = json.maxFuel;
		this.label = json.label;
		this.id = json.id;
	}

	async forward() {
		return window.exec<boolean>(this.id, 'forward');
	}
	async back() {
		return window.exec<boolean>(this.id, 'back');
	}
	async up() {
		return window.exec<boolean>(this.id, 'up');
	}
	async down() {
		return window.exec<boolean>(this.id, 'down');
	}
	async turnLeft(): Promise<boolean> {
		return window.exec<boolean>(this.id, 'turnLeft');
	}
	async turnRight(): Promise<boolean> {
		return window.exec<boolean>(this.id, 'turnRight');
	}
	async dig(dir: BlockDirection) {
		return window.exec<boolean>(this.id, 'dig', dir);
	}
	async selectSlot(slot: number) {
		return window.exec<boolean>(this.id, 'selectSlot', slot);
	}
	async place(dir: BlockDirection, signText?: string) {
		return window.exec<boolean>(this.id, 'place', dir, signText);
	}
	async drop(dir: BlockDirection) {
		return window.exec<boolean>(this.id, 'dropItem', dir);
	}
	async suck(dir: BlockDirection) {
		return window.exec<boolean>(this.id, 'suckItem', dir);
	}
	async refuel(count?: number) {
		return window.exec<boolean>(this.id, 'refuel', count);
	}
	async refresh() {
		return window.exec<boolean>(this.id, 'refresh');
	}
	async undergoMitosis() {
		return window.exec<boolean>(this.id, 'undergoMitosis');
	}
	async moveItems(slot: number, amount: string) {
		return window.exec(this.id, 'moveItems', slot, amount);
	}
	async craft(amount: string) {
		return window.exec(this.id, 'craft', amount);
	}
	async exec(command: string) {
		return window.exec<string>(this.id, 'exec', command);
	}
	async equip(side: 'left' | 'right') {
		return window.exec<string>(this.id, 'equip', side);
	}
	async mineTunnel(direction: string, length: number) {
		return window.exec<string>(this.id, 'mineTunnel', direction, length);
	}
}

export interface World {
	[block: string]: any;
}
export const TurtleContext = createContext<[number, Dispatch<SetStateAction<number>>, Turtle[]]>([-1, () => { }, []] as any);

const IndexPage = () => {
	const classes = useStyles();

	const [turtles, setTurtles] = useState<Turtle[]>([]);
	const [world, setWorld] = useState<World>({});
	const [turtleId, setTurtleId] = useState<number>(-1);

	useEffect(() => {
		window.setTurtles = (array: any[]) => {
			setTurtles(array.map(turtle => new Turtle(turtle)));
		};
		window.setWorld = setWorld;

		window.refreshData();

	}, [setTurtles, setWorld]);

	const selectedTurtle = turtles.find(t => t.id === turtleId);
	useEffect(() => {
		if (turtles.length === 1 || turtles.length > 0 && (turtleId === -1 || !selectedTurtle))
			setTurtleId(turtles[0].id);
	}, [turtles, turtleId]);

	const [disableEvents, setDisableEvents] = useState(false);


	return (
		<TurtleContext.Provider value={[turtleId, setTurtleId, turtles]}>
			<div className={classes.root}>

				{
					turtles.map((t) => (
						<TurtlePage setDisableEvents={setDisableEvents} enabled={turtleId === t.id} key={t.id} turtle={t} />
					))
				}
				<WorldRenderer className={classes.world} turtle={selectedTurtle} world={world} disableEvents={disableEvents} />

			</div>
		</TurtleContext.Provider>
	);
};

export default IndexPage;
