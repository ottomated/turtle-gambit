import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Turtle, BlockDirection } from '../pages';
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
import InputAdornment from '@material-ui/core/InputAdornment';
import SvgIcon from '@material-ui/core/SvgIcon';
import IconButton from '@material-ui/core/IconButton';
import DialogActions from '@material-ui/core/DialogActions/DialogActions';
import TurtleSwitcher from './TurtleSwitcher';
import { DialogContentText } from '@material-ui/core';

export interface TurtlePageProps {
	turtle: Turtle;
	enabled: boolean;
	setDisableEvents: (_: boolean) => void;
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
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'start',
		'&>*': {
			marginLeft: theme.spacing(1),
			marginRight: theme.spacing(1),
		}
	}
}));

function CircularProgressWithLabel(props: CircularProgressProps & { label: any }) {
	return (
		<Box style={{ position: 'relative', display: 'inline-flex' }}>
			<CircularProgress variant="static" {...props} />
			<Box style={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}			>
				<Typography variant="caption" component="div" color="textSecondary">{props.label}</Typography>
			</Box>
		</Box>
	);
}


export default function TurtlePage({ turtle, enabled, setDisableEvents }: TurtlePageProps) {
	const [signText, setSignText] = useState<string | null>(null);
	const [commandText, setCommandText] = useState<string | null>(null);
	const [commandResult, setCommandResult] = useState<string | null>(null);
	const [mineLength, setMineLength] = useState<string>('');
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

	useEffect(() => {
		setDisableEvents(signText !== null || commandText !== null || commandResult !== null);
	}, [signText, commandText]);

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
			<Dialog disableBackdropClick open={commandText !== null} onClose={() => setCommandText(null)}>
				<DialogTitle>Command</DialogTitle>
				<DialogContent>
					<TextField value={commandText || ''} onChange={(ev) => setCommandText(ev.target.value)} variant="outlined" />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCommandText(null)}>Cancel</Button>
					<Button onClick={() => {
						setCommandText(null);
						turtle.exec(commandText!).then((res) => setCommandResult(res));
					}}>Run</Button>
				</DialogActions>
			</Dialog>
			<Dialog disableBackdropClick open={commandResult !== null} onClose={() => setCommandResult(null)}>
				<DialogTitle>Command Result</DialogTitle>
				<DialogContent>
					<DialogContentText>{commandResult}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCommandResult(null)}>Ok</Button>
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
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.craft('all')}>Craft All</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.craft('one')}>Craft One</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.refuel()}>Refuel</Button>
					</ColoredButtonGroup>
					<ColoredButtonGroup size="small" orientation="vertical" groupColor='#9b59b6'>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.refresh()}>Refresh Info</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => turtle.undergoMitosis()}>Undergo Mitosis</Button>
						<Button tabIndex="-1" variant="outlined" color="primary" onClick={() => setCommandText('')}>Run Command</Button>
					</ColoredButtonGroup>
					<TextField
						label="Mine Tunnel"
						variant="outlined"
						value={mineLength}
						onChange={(ev) => setMineLength(ev.target.value)}
						InputProps={{
							endAdornment: <InputAdornment position="end">
								<IconButton onClick={() => turtle.mineTunnel('down', parseInt(mineLength))}>
									<ArrowDownward />
								</IconButton>
								<IconButton onClick={() => turtle.mineTunnel('forward', parseInt(mineLength))}>
									<SvgIcon>
										<path d="M14.79,10.62L3.5,21.9L2.1,20.5L13.38,9.21L14.79,10.62M19.27,7.73L19.86,7.14L19.07,6.35L19.71,5.71L18.29,4.29L17.65,4.93L16.86,4.14L16.27,4.73C14.53,3.31 12.57,2.17 10.47,1.37L9.64,3.16C11.39,4.08 13,5.19 14.5,6.5L14,7L17,10L17.5,9.5C18.81,11 19.92,12.61 20.84,14.36L22.63,13.53C21.83,11.43 20.69,9.47 19.27,7.73Z" />
									</SvgIcon>
								</IconButton>
								<IconButton onClick={() => turtle.mineTunnel('up', parseInt(mineLength))}>
									<ArrowUpward />
								</IconButton>
							</InputAdornment>
						}}
					/>
				</div>
				<TurtleSwitcher />
				<CircularProgressWithLabel variant="static" value={turtle.fuel / turtle.maxFuel * 100} label={turtle.fuel} />
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
