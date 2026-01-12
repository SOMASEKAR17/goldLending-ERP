import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";

const PERMISSIONS = ["view", "create", "edit"];

export default function EditOperatorModal({ isOpen, onClose, operator, onSave }: any) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(operator?.permissions || []);

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = () => {
    onSave({
      id: operator.id,
      permissions: selectedPermissions
    });
  };

  // Reset on open
  useEffect(() => {
    if (operator) setSelectedPermissions(operator.permissions || []);
  }, [operator]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Operator Permissions</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {PERMISSIONS.map((perm) => (
            <label key={perm} className="flex items-center gap-2">
              <Checkbox
                checked={selectedPermissions.includes(perm)}
                onCheckedChange={() => togglePermission(perm)}
              />
              {perm.charAt(0).toUpperCase() + perm.slice(1)}
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
