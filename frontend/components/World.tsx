import { Canvas, MeshProps, extend, useFrame, useThree, ReactThreeFiber, useLoader } from 'react-three-fiber';
import { lazy, useRef, useState, useMemo, useEffect, Suspense, HTMLProps, RefObject, SetStateAction, Dispatch, useContext } from 'react';
import {
	Mesh,
	MeshBasicMaterial,
	InstancedMesh,
	EdgesGeometry,
	BoxBufferGeometry,
	Vector3,
	Quaternion,
	Euler,
	Raycaster,
	Vector2,
	Object3D,
	LineBasicMaterial,
	BufferGeometry,
	Float32BufferAttribute,
	LineSegments
} from 'three';
import { Color as ThreeColor} from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Turtle, TurtleContext, World } from '../pages';
import useEventListener from '@use-it/event-listener';
import Color from 'color';
import Tooltip from '@material-ui/core/Tooltip';
import {use} from "ast-types";

extend({ OrbitControls });
declare global {
	namespace JSX {
		interface IntrinsicElements {
			orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
		}
	}
}

interface BlockInstance {
	position: [number, number, number];
	color: string;
	name: string;
}

interface BlockInstanceGroup {
	blockInstances: BlockInstance[];
	transparent: boolean;
	renderUuid: string | null;
}

const Stats = lazy(() => import('./Stats'));

export const hashCode = function (s: string): number {
	return s.split("").reduce<number>(function (a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
}

function Controls({ target }: { target: [number, number, number] }) {
	// const controls = useInterpolate('target', target);\
	const controls = useRef<any>(null);
	const { camera, gl } = useThree();
	useFrame(() => controls.current.update());
	return (
		<orbitControls ref={controls} target={target as any} args={[camera, gl.domElement]} dampingFactor={0.1} rotateSpeed={0.5} />
	);
}

function useInterpolate(property: 'position' | 'target', position: [number, number, number], rotation?: [number, number, number]) {
	const ref = useRef<any>(null);
	useFrame(() => {
		if (ref.current) {
			const current = ref.current[property];
			const newPos = current.lerp(new Vector3(position[0], position[1], position[2]), 0.3);
			ref.current[property].x = newPos.x;
			ref.current[property].y = newPos.y;
			ref.current[property].z = newPos.z;
			if (rotation) {
				const currentR = ref.current.quaternion;
				const targetR = new Quaternion();
				targetR.setFromEuler(new Euler(rotation[0], rotation[1], rotation[2]));
				const newRot = currentR.slerp(targetR, 0.3);
				ref.current.rotation.setFromQuaternion(newRot);
			}
		}
	});
	return ref;
}

function Model({ url, position, rotation, name }: { url: string, name: string, position: [number, number, number], rotation: [number, number, number] }) {
	const GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader').GLTFLoader;
	const obj = useLoader(GLTFLoader, url) as any;
	const ref = useInterpolate('position', position, rotation);
	return (
		<>
			<mesh
				visible={false}
				position={position}
				name={name}
				scale={[1, 1, 1]}
			>
				<boxBufferGeometry args={[1, 1, 1]} />
			</mesh>
			<primitive ref={ref} object={obj.scene} />
		</>
	);
}

function OtherTurtles({ turtles, switchTurtle }: { turtles: Turtle[], switchTurtle: Function }) {
	const GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader').GLTFLoader;
	const obj = useLoader(GLTFLoader, "/otherturtle.glb") as any;

	return (
		<>
			{turtles.map((turtle) => <OtherTurtle key={turtle.id} turtle={turtle} obj={obj} switchTurtle={switchTurtle} />)}
		</>
	);
}

function OtherTurtle({ obj, turtle, switchTurtle }: { obj: any, turtle: Turtle, switchTurtle: Function }) {
	const geom = useMemo(() => obj.scene.clone(true), []);
	return <>
		<primitive
			position={[turtle.x, turtle.y, turtle.z]}
			rotation={[0, -(turtle.d + 2) * Math.PI / 2, 0]}
			object={geom}
		/>
		<mesh
			onPointerUp={() => switchTurtle(turtle)}
			visible={false}
			position={[turtle.x, turtle.y, turtle.z]}
			name={turtle.label}
			scale={[1, 1, 1]}
		>
			<boxBufferGeometry args={[1, 1, 1]} />
		</mesh>
	</>;
}

function findBlockGroupByRenderId(blockGroups: Map<string, BlockInstanceGroup>, renderUuid: string): BlockInstanceGroup | null {
	for (const g of blockGroups.values()) {
		if (g.renderUuid === renderUuid) {
			return g;
		}
	}
	return null;
}

function TooltipRaycaster({ mouse, hovered, setHovered, blockGroups }: { mouse: RefObject<{ x: number, y: number }>, setHovered: Dispatch<SetStateAction<string>>, blockGroups: Map<string, BlockInstanceGroup> }) {
	const {camera, scene, size} = useThree();
	const ray = useRef<Raycaster>(null);

	useFrame(() => {
		if (!ray.current || !mouse.current) return;
		let pos = new Vector2();
		pos.x = (mouse.current.x / size.width) * 2 - 1;
		pos.y = - (mouse.current.y / size.height) * 2 + 1;

		ray.current.setFromCamera(pos, camera);
		var intersects = ray.current.intersectObjects(scene.children);
		let object: Object3D | BlockInstance | null = null;
		for (let i = 0; i < intersects.length; i++) {
			object = intersects[i].object;
			if (intersects[i].instanceId && intersects[i].instanceId >= 0) {
				const group = findBlockGroupByRenderId(blockGroups, object.uuid);
				if (group && intersects[i].instanceId < group.blockInstances.length) {
					object = group.blockInstances[intersects[i].instanceId];
				}
			}
			if (object.name) break;
		}
		if (object && object.name) {
			if (hovered !== object.name) {
				setHovered(object.name); // This call is actually quite expensive
			}
		} else if (hovered !== '') {
			setHovered('');
		}
	});
	return (<raycaster ref={ray}/>);
}

function groupBlockInstances(world: World, dontShowStone: boolean, showWholeWorld: boolean, turtle: Turtle | undefined, turtles: Turtle[]): Map<string, BlockInstanceGroup> {
	const blockGroups = new Map<string, BlockInstanceGroup>();
	Object.keys(world).map((k, i) => {
		const positions = k.split(',').map(p => parseInt(p)) as [number, number, number];
		const {name, metadata} = world[k];
		if (dontShowStone && name === 'minecraft:stone') {
			return null;
		}
		if (!showWholeWorld && turtle && (Math.pow(positions[0] - turtle.x, 2) + Math.pow(positions[1] - turtle.y, 2) + Math.pow(positions[2] - turtle.z, 2)) > 1000) {
			return null;
		}
		const transparent = name.includes('water') || name.includes('lava') || !!turtles.find(t => {
			let checkEqual = (t: Turtle, positions: number[], x: number, y: number, z: number) => t.x === positions[0] + x && t.y === positions[1] + y && t.z === positions[2] + z;
			for (let x = -1; x <= 1; x++) {
				for (let y = -1; y <= 1; y++) {
					for (let z = -1; z <= 1; z++) {
						if (checkEqual(t, positions, x, y, z)) return true;
					}
				}
			}
			return false;
		});
		const block = {
			position: positions,
			color: new ThreeColor(Color({h: hashCode(name + ':' + metadata) % 360, s: 60, l: 40}).toString()),
			name: name + ':' + metadata
		};
		let groupKey = transparent.toString();
		if (!blockGroups.has(groupKey)) {
			blockGroups.set(groupKey, {blockInstances: [], transparent, renderUuid: null});
		}
		blockGroups.get(groupKey).blockInstances.push(block);
	});
	return blockGroups;
}

export default function WorldRenderer({ turtle, world, disableEvents, ...props }: { turtle?: Turtle, world: World, disableEvents: boolean } & HTMLProps<HTMLDivElement>) {

	const [, setTurtleIndex, turtles] = useContext(TurtleContext);
	const position = useRef({ x: 0, y: 0 });
	const popperRef = useRef<any>(null);
	const [hovered, setHovered] = useState<string>('');
	const [showWholeWorld, setShowWholeWorld] = useState<boolean>(false);
	const [dontShowStone, setDontShowStone] = useState<boolean>(false);
	const [showFPS, setShowFPS] = useState<boolean>(false);

	const disableEventsRef = useRef<boolean>(disableEvents);
	useEffect(() => {
		disableEventsRef.current = disableEvents;
	}, [disableEvents]);
	const currentTurtleRef = useRef<Turtle | undefined>(turtle);
	useEffect(() => {
		currentTurtleRef.current = turtle;
	}, [turtle]);

	useEventListener('keyup', (ev: KeyboardEvent) => {
		let moved = false;
		if (ev.code === 'KeyV') {
			moved = true;
			setShowWholeWorld(w => !w);
		} else if (ev.code === 'KeyB') {
			moved = true;
			setDontShowStone(w => !w);
		} else if (ev.code === 'KeyF') {
			moved = true;
			setShowFPS(w => !w);
		}
		if (disableEventsRef.current || !currentTurtleRef.current) return;
		if (ev.code === 'KeyW') {
			moved = true;
			currentTurtleRef.current.forward();
		} else if (ev.code === 'KeyA') {
			moved = true;
			currentTurtleRef.current.turnLeft();
		} else if (ev.code === 'KeyS') {
			moved = true;
			currentTurtleRef.current.back();
		} else if (ev.code === 'KeyD') {
			moved = true;
			currentTurtleRef.current.turnRight();
		} else if (ev.code === 'Space') {
			moved = true;
			currentTurtleRef.current.up();
		} else if (ev.code === 'ShiftLeft') {
			moved = true;
			currentTurtleRef.current.down();
		}
		if (moved) {
			ev.stopPropagation();
			ev.preventDefault();
		}
	});

	const blockGroups: Map<string, BlockInstanceGroup> = groupBlockInstances(world, dontShowStone, showWholeWorld, turtle, turtles);
	return (
		<Tooltip
			title={hovered}
			PopperProps={{
				popperRef,
				anchorEl: {
					clientHeight: 0,
					clientWidth: 0,
					getBoundingClientRect: () => ({
						top: position.current.y + 100,
						left: position.current.x,
						right: position.current.x,
						bottom: position.current.y + 100,
						width: 0,
						height: 0,
					}),
				}
			}}
			onMouseMove={(ev) => {
				// console.log(scene);
				// // mouse.x = (ev.clientX / size.width) * 2 - 1;
				// // mouse.y = - (ev.clientY / size.height) * 2 + 1;
				// ray.setFromCamera(mouse, camera)
				// var intersects = ray.intersectObjects(scene.children);
				// if (intersects.length > 0) {
				// 	console.log(intersects[0].object.name);
				// } else {
				// 	console.log("Nothing");
				// }
				// console.log(ev.clientY);
				const canvasYOffset = ev.target.getBoundingClientRect().top;
				position.current = { x: ev.clientX, y: ev.clientY - canvasYOffset };
				if (popperRef.current)
					popperRef.current.update();
			}}
		>
			<div {...props}>
				<Canvas>
					{
						showFPS && (
							<Suspense fallback={null}>
								<Stats />
							</Suspense>
						)
					}
					<Controls target={turtle ? [turtle.x, turtle.y, turtle.z] : [0, 0, 0]} />
					<TooltipRaycaster mouse={position} hovered={hovered} setHovered={setHovered} blockGroups={blockGroups} />
					<ambientLight />
					{
						turtle &&
						<Suspense fallback={null}>
							<Model name={turtle.label} url="/turtle.glb" position={[turtle.x, turtle.y, turtle.z]} rotation={[0, -(turtle.d + 2) * Math.PI / 2, 0]} />
						</Suspense>
					}
					<Suspense fallback={null}>
						{
							[...blockGroups.keys()].map(k => (
								<Blocks group={blockGroups.get(k)} key={k}/>
							))
						}
						<BlockLines groups={blockGroups.values()} />
					</Suspense>

					<Suspense fallback={null}>
						<OtherTurtles switchTurtle={(turtle: Turtle) => {
							setTurtleIndex(turtle.id);
						}} turtles={turtles.filter(t => t.id !== turtle?.id)} />
					</Suspense>
				</Canvas>
			</div>
		</Tooltip>
	)
}
const boxGeom = new BoxBufferGeometry(1, 1, 1);
const boxEdgeGeom = new EdgesGeometry(boxGeom.scale(1.0000001, 1.0000001, 1.0000001));

function Blocks(props: { group: BlockInstanceGroup }) {
	const instancedMesh = useRef<InstancedMesh>();
	const mat = new MeshBasicMaterial({color: '#ffffff', transparent: props.group.transparent, opacity: props.group.transparent ? 0.5 : 1});
	const blockTransform = new Object3D();
	let set = false;
	useFrame(() => {
		if (set) {
			return;
		}
		props.group.blockInstances.map((block, i) => {
			blockTransform.position.set(...(block.position));
			blockTransform.rotation.set(0, 0, 0);
			blockTransform.updateMatrix();
			instancedMesh.current.setMatrixAt(i, blockTransform.matrix);
			block.color && instancedMesh.current.setColorAt(i, block.color);
		});
		instancedMesh.current.instanceMatrix.needsUpdate = true;
		props.group.renderUuid = instancedMesh.current.uuid;
		set = true;
	});
	return (
		<instancedMesh args={[boxGeom, mat, props.group.blockInstances.length]} ref={instancedMesh} />
	);
}

function BlockLines(props: {groups: Iterable<BlockInstanceGroup>}) {
	const geometry = new BufferGeometry();
	const material = new LineBasicMaterial({ color: '#000000' });

	const positions = [];
	for (const group of props.groups) {
		for (const block of group.blockInstances) {
			const edgePositions = boxEdgeGeom.getAttribute('position');
			edgePositions.array.forEach((v, i) => {
				positions.push(v + block.position[i % 3]);
			});
		}
	}

	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();

	return (<lineSegments geometry={geometry} material={material} />);
}