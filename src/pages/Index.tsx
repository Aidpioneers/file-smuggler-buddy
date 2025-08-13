import { useState, useEffect } from 'react';
import MapboxMap from '@/components/MapboxMap';
import { ApiKeyForm } from '@/components/ApiKeyForm';

const Index = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('mapbox_access_token');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleApiKeySubmit = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  if (!apiKey) {
    return <ApiKeyForm onApiKeySubmit={handleApiKeySubmit} />;
  }

  return <MapboxMap apiKey={apiKey} />;
};

export default Index;
