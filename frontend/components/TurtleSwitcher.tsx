import { MenuItem, Select } from '@material-ui/core';
import { useContext } from 'react';
import {  TurtleContext } from '../pages';


export default function TurtleSwitcher() {
	const [index, setIndex, turtles] = useContext(TurtleContext);
	return (
		<Select tabIndex={-1} variant="outlined" value={index} onChange={(ev) => setIndex(ev.target.value as number)}>
			{turtles.map(t => (
				<MenuItem key={t.id} value={t.id}>#{t.id} - {t.label}</MenuItem>
			))}
		</Select>
	)
}