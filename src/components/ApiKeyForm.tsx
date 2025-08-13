import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Key, ExternalLink, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
}

export const ApiKeyForm = ({ onApiKeySubmit }: ApiKeyFormProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Mapbox access token",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Basic validation - check if it looks like a Mapbox token
      if (!apiKey.startsWith('pk.')) {
        throw new Error('Invalid Mapbox token format');
      }
      
      localStorage.setItem('mapbox_access_token', apiKey);
      onApiKeySubmit(apiKey);
      
      toast({
        title: "Success",
        description: "Mapbox access token saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid Mapbox access token",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-marathon-blue rounded-full flex items-center justify-center shadow-marathon">
            <MapPin className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-marathon-blue bg-clip-text text-transparent">
            Marathon Map
          </h1>
          <p className="text-muted-foreground">
            Visualize marathon opportunities worldwide
          </p>
        </div>

        <Card className="bg-gradient-card border-border/50 shadow-marathon">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle>Mapbox Access Token</CardTitle>
            </div>
            <CardDescription>
              Enter your Mapbox public access token to view the interactive marathon map.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Access Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="pk.eyJ1Ijoi..."
                  className="bg-background/50 border-border"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your token starts with "pk." and is kept locally in your browser.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-hero hover:opacity-90 transition-opacity" 
                disabled={isLoading}
              >
                {isLoading ? "Validating..." : "Access Map"}
              </Button>
            </form>
            
            <div className="pt-4 border-t border-border/50">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Don't have a Mapbox token?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://mapbox.com/', '_blank')}
                  className="border-border bg-background/50 hover:bg-background"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get Free Token
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">About this map:</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Interactive visualization of marathon data</li>
                <li>• Real-time availability status</li>
                <li>• Clustered view for better navigation</li>
                <li>• Filter by marathon type and location</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};