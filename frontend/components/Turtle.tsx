import React, { useMemo, useState, useRef } from 'react';
import { Turtle, World, BlockDirection } from '../pages';
import Button from '@material-ui/core/Button';
import ButtonGroup, { ButtonGroupProps } from '@material-ui/core/ButtonGroup';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import ArrowUpward from '@material-ui/icons/ArrowUpward';
import CircularProgress, { CircularProgressProps } from '@material-ui/core/CircularProgress';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { MuiThemeProvider, createMuiTheme, makeStyles } from '@material-ui/core/styles';
import Inventory from './Inventory';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import DialogActions from '@material-ui/core/DialogActions/DialogActions';
import TurtleSwitcher from './TurtleSwitcher';

export interface TurtlePageProps {
	turtle: Turtle;
	enabled: boolean;
}

const useStyles = makeStyles(theme => ({
	toolbar: {
		display: 'flex',
		justifyContent: 'start',
		alignItems: 'center',
		background: '#252525',
		height: 100,
		width: '100%',
	},
	groups: {
		'&>*': {
			marginLeft: theme.spacing(1),
			marginRight: theme.spacing(1),
		}
	}
}));

function CircularProgressWithLabel(props: CircularProgressProps) {
	return (
		<Box style={{ position: 'relative', display: 'inline-flex' }}>
			<CircularProgress variant="static" {...props} />
			<Box style={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}			>
				<Typography variant="caption" component="div" color="textSecondary">{`${Math.round(props.value!)}%`}</Typography>
			</Box>
		</Box>
	);
}


export default function TurtlePage({ turtle, enabled }: TurtlePageProps) {
	const [signText, setSignText] = useState<string | null>(null);
	const currentSignDirection = useRef<BlockDirection>(BlockDirection.FORWARD);
	const classes = useStyles({ enabled });

	const placeBlock = (dir: BlockDirection) => {
		if (turtle.inventory[turtle.selectedSlot - 1]?.name === 'minecraft:sign') {
			currentSignDirection.current = dir;
			setSignText('');
		} else {
			turtle.place(dir);
		}
	}

	return (
		<>
			<Dialog disableBackdropClick open={signText !== null} onClose={() => setSignText(null)}>
				<DialogTitle>Sign Text</DialogTitle>
				<DialogContent>
					<TextField value={signText || ''} onChange={(ev) => setSignText(ev.target.value)} variant="outlined" />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setSignText(null)}>Cancel</Button>
					<Button onClick={() => {
						setSignText(null);
						turtle.place(currentSignDirection.current, signText!);
					}}>Place</Button>
				</DialogActions>
			</Dialog>
			<div className={classes.toolbar} style={{ display: enabled ? undefined : "none" }}>
				<Inventory turtle={turtle} />
				<div className={classes.groups}>
					<TurtleButtonGroup turtle={turtle} func="dig" color='#e74c3c' />
					<ColoredButtonGroup groupColor='#e67e22' size="small" orientation="vertical">
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => placeBlock(BlockDirection.UP)}><ArrowUpward /></Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => placeBlock(BlockDirection.FORWARD)}>
							place
						</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => placeBlock(BlockDirection.DOWN)}><ArrowDownward /></Button>
					</ColoredButtonGroup>
					<TurtleButtonGroup turtle={turtle} func="suck" color='#f1c40f' />
					<TurtleButtonGroup turtle={turtle} func="drop" color='#2ecc71' />
					<ColoredButtonGroup size="small" orientation="vertical" groupColor='#3498db'>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.refresh()}>Refresh Info</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.refuel()}>Refuel</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.undergoMitosis()}>Undergo Mitosis</Button>
					</ColoredButtonGroup>
				</div>
				<TurtleSwitcher />
				<CircularProgressWithLabel variant="static" value={turtle.fuel / turtle.maxFuel * 100} />
			</div>
		</>
	);
}

interface TurtleButtonGroupProps {
	turtle: Turtle;
	func: 'place' | 'dig' | 'drop' | 'suck';
	color: string;
}

function ColoredButtonGroup({ groupColor, ...props }: { groupColor: string } & ButtonGroupProps) {
	const theme = useMemo(() => createMuiTheme({
		palette: {
			primary: {
				main: groupColor
			}
		},
	}), [groupColor]);
	return (
		<MuiThemeProvider theme={theme}>
			<ButtonGroup {...props} />
		</MuiThemeProvider >
	);

}

function TurtleButtonGroup({ turtle, func, color }: TurtleButtonGroupProps) {
	return (
		<ColoredButtonGroup groupColor={color} size="small" orientation="vertical">
			<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle[func](BlockDirection.UP)}><ArrowUpward /></Button>
			<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle[func](BlockDirection.FORWARD)}>
				{func}
			</Button>
			<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle[func](BlockDirection.DOWN)}><ArrowDownward /></Button>
		</ColoredButtonGroup>
	);
}
