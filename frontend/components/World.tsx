import { Canvas, MeshProps, extend, useFrame, useThree, ReactThreeFiber, useLoader } from 'react-three-fiber';
import { useRef, useState, useMemo, useEffect, Suspense, HTMLProps, RefObject, SetStateAction, Dispatch, useContext } from 'react';
import { Mesh, BoxBufferGeometry, Vector3, Quaternion, Euler, Raycaster, Vector2, Object3D } from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Turtle, TurtleContext, World } from '../pages';
import useEventListener from '@use-it/event-listener';
import Color from 'color';
import Tooltip from '@material-ui/core/Tooltip';

extend({ OrbitControls });
declare global {
	namespace JSX {
		interface IntrinsicElements {
			orbitControls: ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>
		}
	}
}

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

function Model({ url, position, rotation }: { url: string, position: [number, number, number], rotation: [number, number, number] }) {
	const GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader').GLTFLoader;
	const obj = useLoader(GLTFLoader, url) as any;
	const ref = useInterpolate('position', position, rotation);
	return <primitive ref={ref} object={obj.scene} />;
}

function OtherTurtles({ turtles }: { turtles: Turtle[] }) {
	const GLTFLoader = require('three/examples/jsm/loaders/GLTFLoader').GLTFLoader;
	const obj = useLoader(GLTFLoader, "/otherturtle.glb") as any;
	const [geometries, setGeometries] = useState<any[]>([]);
	// useEffect(() => {
	// 	setGeometries(old => {
	// 		old.push(obj.scene.clone(true));
	// 		old.push(obj.scene.clone(true));
	// 		// while(old.length < turtles.length) {
	// 		// 	old.push(obj.scene.clone(true));
	// 		// }
	// 		return [
	// 			obj.scene.clone(true),
	// 			obj.scene.clone(true)
	// 		];
	// 	})
	// }, [obj, turtles.length]);
	// console.log(geometries, turtles.length);
	return (
		<>
			{turtles.map((turtle, i) => <OtherTurtle turtle={turtle} obj={obj} />)}
		</>
	);
}

function OtherTurtle({ obj, turtle }: { obj: any, turtle: Turtle }) {
	const geom = useMemo(() => obj.scene.clone(true), []);
	return <primitive
		position={[turtle.x, turtle.y, turtle.z]}
		rotation={[0, -(turtle.d + 2) * Math.PI / 2, 0]}
		object={geom}
	/>;
}

function TooltipRaycaster({ mouse, setHovered }: { mouse: RefObject<{ x: number, y: number }>, setHovered: Dispatch<SetStateAction<string>> }) {
	const { camera, scene, size } = useThree();
	const ray = useRef<Raycaster>(null);

	useFrame(() => {
		if (!ray.current || !mouse.current) return;
		let pos = new Vector2();
		pos.x = (mouse.current.x / size.width) * 2 - 1;
		pos.y = - (mouse.current.y / size.height) * 2 + 1;

		ray.current.setFromCamera(pos, camera);
		var intersects = ray.current.intersectObjects(scene.children);
		let object: Object3D | null = null;
		for (let i = 0; i < intersects.length; i++) {
			object = intersects[i].object;
			if (object.name) break;
		}
		if (object) {
			setHovered(object.name);
		} else {
			setHovered('');
		}
	});

	return <raycaster ref={ray} />;
}

export default function WorldRenderer({ turtle, world, disableEvents, ...props }: { turtle: Turtle, world: World, disableEvents: boolean } & HTMLProps<HTMLDivElement>) {

	const [, , turtles] = useContext(TurtleContext);
	const position = useRef({ x: 0, y: 0 });
	const popperRef = useRef<any>(null);
	const [hovered, setHovered] = useState<string>('');

	const disableEventsRef = useRef<boolean>(disableEvents);
	useEffect(() => {
		disableEventsRef.current = disableEvents;
	}, [disableEvents]);

	useEventListener('keyup', (ev: KeyboardEvent) => {
		if (disableEventsRef.current) return;
		if (ev.code === 'KeyW') {
			turtle.forward();
		} else if (ev.code === 'KeyA') {
			turtle.turnLeft();
		} else if (ev.code === 'KeyS') {
			turtle.back();
		} else if (ev.code === 'KeyD') {
			turtle.turnRight();
		} else if (ev.code === 'Space') {
			turtle.up();
		} else if (ev.code === 'ShiftLeft') {
			turtle.down();
		}
	});
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
				position.current = { x: ev.clientX, y: ev.clientY - 100 };
				if (popperRef.current)
					popperRef.current.update();
			}}
		>
			<div {...props}>
				<Canvas>
					<Controls target={[turtle.x, turtle.y, turtle.z]} />
					<TooltipRaycaster mouse={position} setHovered={setHovered} />
					<ambientLight />
					<Suspense fallback={null}>
						<Model url="/turtle.glb" position={[turtle.x, turtle.y, turtle.z]} rotation={[0, -(turtle.d + 2) * Math.PI / 2, 0]} />
					</Suspense>
					{Object.keys(world).map(k => {
						let positions = k.split(',').map(p => parseInt(p)) as [number, number, number];
						return <Box key={k} position={positions} name={world[k].name} color={Color({
							h: hashCode(world[k].name) % 360,
							s: 60,
							l: 40,
						}).toString()} />
					})}
					<Suspense fallback={null}>
						<OtherTurtles turtles={turtles.filter(t => t.id !== turtle.id)} />
					</Suspense>
				</Canvas>
			</div>
		</Tooltip>
	)
}

function Box(props: MeshProps & { color: string, name: string }) {
	if (props.name === 'computercraft:turtle_expanded') return null;
	// This reference will give us direct access to the mesh
	const mesh = useRef<Mesh>()

	// Set up state for the hovered and active state

	// Rotate mesh every frame, this is outside of React without overhead
	// useFrame(() => {
	// 	if (mesh.current) mesh.current.rotation.x = mesh.current.rotation.y += 0.01
	// 	if (lines.current) lines.current.rotation.x = lines.current.rotation.y += 0.01
	// })

	const geom = useMemo(() => new BoxBufferGeometry(1, 1, 1), []);

	return (
		<>
			<mesh
				{...props}
				ref={mesh}
				scale={[1, 1, 1]}
			>
				<boxBufferGeometry args={[1, 1, 1]} />
				<meshBasicMaterial color={props.color} />
			</mesh>
			<lineSegments scale={[1, 1, 1]} position={props.position}>
				<edgesGeometry args={[geom]} />
				<lineBasicMaterial color="black" attach="material" />
			</lineSegments>
		</>
	)
}