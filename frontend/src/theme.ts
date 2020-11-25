import { createMuiTheme } from '@material-ui/core/styles';
import { red } from '@material-ui/core/colors';

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    primary: red,
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
    type: 'dark'
  },
  overrides: {
    MuiTooltip: {
      tooltip: {
        fontSize: 20
      }
    }
  }
});

export default theme;