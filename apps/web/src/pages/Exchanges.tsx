// ── Exchanges Page ──

// ... other imports and code ...

  const handleDelete = async (id: string): Promise<boolean> => {
    try {
      await deleteExchange(id);
      return true;
    } catch (e) {
      console.error('Failed to delete exchange', e);
      return false;
    }
  };

// ... rest of the component ...
