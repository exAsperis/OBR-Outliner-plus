import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { formatLayerName, OUTLINER_LAYERS_TOP_TO_BOTTOM } from "./layers";
import { setLayerEnabled, useLayerDisplaySettings } from "./layerSettings";

export function SettingsPanel() {
  const settings = useLayerDisplaySettings();
  const enabled = new Set(settings.enabledLayers);
  return <Box component="li" sx={{ listStyle: "none" }}>
    <Box id="outliner-settings" component="section" aria-labelledby="use-layers-heading" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Typography id="use-layers-heading" variant="subtitle2" sx={{ mb: 0.5 }}>Use layers</Typography>
      <FormGroup>
        {OUTLINER_LAYERS_TOP_TO_BOTTOM.map((layer) => <FormControlLabel
          key={layer}
          label={formatLayerName(layer)}
          labelPlacement="start"
          control={<Switch size="small" checked={enabled.has(layer)} onChange={(_, checked) => setLayerEnabled(layer, checked)} inputProps={{ "aria-label": `Use ${formatLayerName(layer)} layer` }} />}
          sx={{ justifyContent: "space-between", ml: 0, mr: 0, minHeight: 34, "& .MuiFormControlLabel-label": { fontSize: "0.875rem" } }}
        />)}
      </FormGroup>
    </Box>
  </Box>;
}
