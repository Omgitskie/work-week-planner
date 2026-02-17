import { useState } from 'react';
import { useAppData } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Check, X, Store } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function EmployeeManager() {
  const { data, addEmployee, updateEmployee, removeEmployee, addStore, removeStore } = useAppData();
  const [newName, setNewName] = useState('');
  const [newStore, setNewStore] = useState('');
  const [newEntitlement, setNewEntitlement] = useState('28');
  const [newStoreName, setNewStoreName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editEntitlement, setEditEntitlement] = useState('28');
  const [showStoreManager, setShowStoreManager] = useState(false);

  const handleAdd = () => {
    if (!newName.trim() || !newStore) return;
    addEmployee(newName.trim(), newStore, parseInt(newEntitlement) || 28);
    toast({ title: 'Employee added', description: newName.trim() });
    setNewName('');
    setNewStore('');
    setNewEntitlement('28');
  };

  const handleEdit = (id: string) => {
    const emp = data.employees.find(e => e.id === id);
    if (emp) {
      setEditingId(id);
      setEditName(emp.name);
      setEditStore(emp.store);
      setEditEntitlement(String(emp.entitlement));
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      updateEmployee(editingId, editName.trim(), editStore, parseInt(editEntitlement) || 28);
      setEditingId(null);
    }
  };

  const handleAddStore = () => {
    if (!newStoreName.trim()) return;
    if (data.stores.includes(newStoreName.trim())) {
      toast({ title: 'Store already exists', variant: 'destructive' });
      return;
    }
    addStore(newStoreName.trim());
    toast({ title: 'Store added', description: newStoreName.trim() });
    setNewStoreName('');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Employee Management</h2>
        <Button variant="outline" size="sm" onClick={() => setShowStoreManager(!showStoreManager)}>
          <Store className="w-4 h-4 mr-1.5" />
          Manage Stores
        </Button>
      </div>

      {showStoreManager && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <h3 className="text-sm font-semibold">Stores</h3>
          <div className="flex flex-wrap gap-2">
            {data.stores.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-sm">
                {s}
                <button onClick={() => removeStore(s)} className="text-muted-foreground hover:text-destructive ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="New store name..."
              value={newStoreName}
              onChange={e => setNewStoreName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAddStore()}
            />
            <Button size="sm" onClick={handleAddStore}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add employee form */}
      <div className="flex gap-2">
        <Input
          placeholder="Employee name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="h-9"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Select value={newStore} onValueChange={setNewStore}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Store..." />
          </SelectTrigger>
          <SelectContent>
            {data.stores.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Days"
          value={newEntitlement}
          onChange={e => setNewEntitlement(e.target.value)}
          className="h-9 w-20"
          min={0}
          max={99}
        />
        <Button onClick={handleAdd} disabled={!newName.trim() || !newStore}>
          <Plus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-grid-header">
              <TableHead>Name</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="w-24">Entitlement</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.employees.map(emp => (
              <TableRow key={emp.id}>
                <TableCell>
                  {editingId === emp.id ? (
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" />
                  ) : (
                    <span className="font-medium">{emp.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === emp.id ? (
                    <Select value={editStore} onValueChange={setEditStore}>
                      <SelectTrigger className="h-7 w-32 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.stores.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{emp.store}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === emp.id ? (
                    <Input type="number" value={editEntitlement} onChange={e => setEditEntitlement(e.target.value)} className="h-7 w-16 text-sm" min={0} max={99} />
                  ) : (
                    <span>{emp.entitlement}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === emp.id ? (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={handleSaveEdit}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(emp.id)}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => removeEmployee(emp.id)} className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
