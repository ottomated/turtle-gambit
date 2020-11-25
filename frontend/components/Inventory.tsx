import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import makeStyles from '@material-ui/core/styles/makeStyles';
import React, { useState } from 'react';
import { Turtle } from '../pages';
import Typography from '@material-ui/core/Typography';
import { hashCode } from './World';
import Color from 'color';

const useStyles = makeStyles(() => ({

	inventory: {
		position: 'absolute',
		top: 100,
		left: 0,
		background: '#252525',
		height: 200,
		width: 200,
		zIndex: 10,
		borderRadius: 5,
		overflow: 'hidden'
	},
	inventoryItem: {
		width: '25%',
		height: '25%',
		'& .MuiPaper-root': {
			height: '100%',
			width: '100%',
			border: '2px solid transparent',
			'&.selected': {
				borderColor: 'white'
			}
		},
		cursor: 'pointer'
	}
}));

const initialState = {
	mouseX: null,
	mouseY: null,
	slot: 0
};

interface InventoryProps {
	turtle: Turtle;
}

export default function Inventory({ turtle }: InventoryProps) {
	const classes = useStyles();
	const [state, setState] = useState<{
		mouseX: null | number;
		mouseY: null | number;
		slot: number;
	}>(initialState);

	const handleClick = (event: React.MouseEvent<HTMLDivElement>, slot: number) => {
		event.preventDefault();
		setState({
			mouseX: event.clientX - 2,
			mouseY: event.clientY - 4,
			slot
		});
	};

	const handleClose = (amount: 'all' | 'half' | 'one') => {
		turtle.moveItems(state.slot, amount);
		setState(initialState);
	};

	let menuItems = [];
	if (state.slot === turtle.selectedSlot) {
		menuItems = [
			<MenuItem key={3} onClick={() => {
				turtle.equip('left'); setState({ ...initialState, slot: turtle.selectedSlot });
			}}>Equip Left</MenuItem>,
			<MenuItem key={4} onClick={() => {
				turtle.equip('right'); setState({ ...initialState, slot: turtle.selectedSlot });
			}}>Equip Right</MenuItem>
		];
	} else {
		menuItems = [
			<MenuItem key={0} onClick={() => handleClose('all')}>Move All</MenuItem>,
			<MenuItem key={1} onClick={() => handleClose('half')}>Move Half</MenuItem>,
			<MenuItem key={2} onClick={() => handleClose('one')}>Move One</MenuItem>
		];
	}

	return (
		<Grid container spacing={1} className={classes.inventory}>
			<Menu
				keepMounted
				open={state.mouseY !== null}
				onClose={handleClose}
				anchorReference="anchorPosition"
				anchorPosition={
					state.mouseY !== null && state.mouseX !== null
						? { top: state.mouseY, left: state.mouseX }
						: undefined
				}
			>
				{menuItems}
			</Menu>
			{
				turtle.inventory.map((item, i) => (
					<Grid key={i} item xs={3} className={classes.inventoryItem}>
						<Paper onContextMenu={(ev) => handleClick(ev, i + 1)} className={i + 1 === turtle.selectedSlot ? 'selected' : ''} style={{
							background: item ? Color({
								h: hashCode(item.name + ':' + item.damage) % 360,
								s: 60,
								l: 40
							}).toString() : undefined
						}} onClick={() => turtle.selectSlot(i + 1)}>
							{item &&
								<Tooltip title={item.name + ':' + item.damage}>
									<Typography align="center" variant="h4">{item.count}</Typography>
								</Tooltip>
							}
						</Paper>
					</Grid>
				))
			}
		</Grid>
	);
}