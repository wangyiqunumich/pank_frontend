import {createTheme} from "@mui/material";
import themeTypography from "./themeTypography";

export const theme = () => {
    const appTheme = createTheme({
        direction: 'ltr',
        typography: themeTypography()
    });
    return appTheme;
};

export default theme;