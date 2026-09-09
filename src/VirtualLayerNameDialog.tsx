import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, type FormEvent } from "react";

export function VirtualLayerNameDialog({ title, initialValue = "", submitLabel, onCancel, onSubmit }: {
  title: string;
  initialValue?: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit(name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the virtual layer name.");
      setSaving(false);
    }
  };

  return <Dialog open onClose={saving ? undefined : onCancel} fullWidth maxWidth="xs" aria-labelledby="virtual-layer-name-title">
    <Stack component="form" onSubmit={(event) => void submit(event)}>
      <DialogTitle id="virtual-layer-name-title">{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Virtual layer name"
          value={name}
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
          helperText="Use group: state for alternatives and / for guardian dependencies."
          inputProps={{ "aria-label": "Virtual layer name" }}
        />
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{submitLabel}</Button>
      </DialogActions>
    </Stack>
  </Dialog>;
}
