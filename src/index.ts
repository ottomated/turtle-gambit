import { Server } from 'ws';
// import { connect } from 'ngrok';
import { App, launch } from 'carlo';
import { resolve } from 'path';
import { Turtle } from './turtle';
import World from './world';
import Queue from 'p-queue';

const wss = new Server({ port: 5757 });

let app: App;
let turtles: { [id: number]: Turtle } = {};

const world = new World();
const queue = new Queue({ concurrency: 1 });
const turtleAddQueue = new Queue({ concurrency: 1 });
turtleAddQueue.pause();

(async () => {
	// const url = await connect(5757);
	// console.log(url);
	app = await launch();
	app.on('exit', () => process.exit());
	app.serveFolder(resolve(process.cwd(), "frontend/out"));
	// app.load('http://localhost:3000');

	app.exposeFunction('exec', async (index: number, func: string, ...args: any[]) => {
		if (typeof index === 'string') {
			[index, func, ...args] = JSON.parse(index).args;
		}
		return await queue.add(() => ((turtles[index] as any)[func])(...args));
	});

	app.exposeFunction('refreshData', async () => {
		await app.evaluate(`if (window.setWorld) window.setWorld(${JSON.stringify(world.getAllBlocks())})`);
		await app.evaluate(`if (window.setTurtles) window.setTurtles(${serializeTurtles()})`);
	})

	await app.load('http://localhost:3000');
	world.on('update', async (world) => {
		await app.evaluate(`if (window.setWorld) window.setWorld(${JSON.stringify(world)})`);
	});
	turtleAddQueue.start();

})();
wss.on('connection', async function connection(ws) {
	await turtleAddQueue.add(() => {
		let turtle = new Turtle(ws, world);
		turtle.on('init', async () => {
			turtles[turtle.id] = turtle;
			turtle.on('update', () => app.evaluate(`if (window.setTurtles) window.setTurtles(${serializeTurtles()})`));
			await app.evaluate(`if (window.setTurtles) window.setTurtles(${serializeTurtles()})`)
			await app.evaluate(`if (window.setWorld) window.setWorld(${JSON.stringify(world.getAllBlocks())})`);
			ws.on('close', async () => {
				delete turtles[turtle.id];
				await app.evaluate(`if (window.setTurtles) window.setTurtles(${serializeTurtles()})`)
			});
		});
	});
});

function serializeTurtles() {
	return JSON.stringify(Object.values(turtles));
}