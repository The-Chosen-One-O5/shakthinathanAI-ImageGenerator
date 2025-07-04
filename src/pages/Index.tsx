import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Zap, Image, Download, Copy, Check } from "lucide-react";

const Index = () => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux-schnell');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImages, setNumImages] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const generateImages = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setImages([]);

    try {
      const response = await fetch('https://bezmxockiownontvryzy.supabase.co/functions/v1/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlem14b2NraW93bm9udHZyeXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NTUzMTgsImV4cCI6MjA2NzEzMTMxOH0.LXJ2FeZjfOgdBrGErgzWgZdb6Md2WZL3XA4gyiFp8lA`,
        },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
          numImages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate images');
      }

      const data = await response.json();
      
      if (data.images) {
        setImages(data.images);
        toast({
          title: "Success",
          description: `Generated ${data.images.length} image(s)`,
        });
      }
    } catch (error) {
      console.error('Error generating images:', error);
      toast({
        title: "Error",
        description: "Failed to generate images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyImageUrl = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied",
        description: "Image URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `shakthinathan-ai-${index + 1}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Downloaded",
        description: "Image saved to your device",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/20"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(262_83%_58%/0.1),transparent)]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <Badge variant="outline" className="text-xs font-medium px-3 py-1">
              AI POWERED
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            SHAKTHINATHAN AI
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform your imagination into stunning visuals with our advanced AI image generation platform
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-elegant animate-slide-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Prompt Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Prompt
                  </label>
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A majestic dragon soaring through cloudy skies..."
                    className="bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-primary/25"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        generateImages();
                      }
                    }}
                  />
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    AI Model
                  </label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flux-schnell">FLUX Schnell (⚡ Fast)</SelectItem>
                      <SelectItem value="flux-dev">FLUX Dev (🎨 Quality)</SelectItem>
                      <SelectItem value="dalle-3">DALL-E 3 (🔬 Precision)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio & Count Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Aspect Ratio
                    </label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="bg-muted/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">Square</SelectItem>
                        <SelectItem value="16:9">Landscape</SelectItem>
                        <SelectItem value="9:16">Portrait</SelectItem>
                        <SelectItem value="4:3">Classic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Count
                    </label>
                    <Select value={numImages.toString()} onValueChange={(value) => setNumImages(parseInt(value))}>
                      <SelectTrigger className="bg-muted/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={generateImages}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full bg-gradient-primary hover:opacity-90 shadow-glow transition-all duration-300 h-12 text-base font-semibold"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Image className="h-5 w-5 mr-2" />
                      Generate Images
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {isLoading && (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-elegant animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <p className="text-lg font-medium mt-4 text-foreground">Creating your masterpiece...</p>
                  <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
                </CardContent>
              </Card>
            )}

            {images.length > 0 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Generated Images</h2>
                  <Badge variant="secondary" className="text-sm">
                    {images.length} image{images.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {images.map((image, index) => (
                    <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 shadow-elegant overflow-hidden group hover:shadow-glow transition-all duration-300">
                      <div className="relative">
                        <img
                          src={image}
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        
                        {/* Action Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyImageUrl(image, index)}
                            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                          >
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadImage(image, index)}
                            className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground truncate">
                          {prompt}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && images.length === 0 && (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-elegant">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-24 h-24 rounded-full bg-gradient-secondary flex items-center justify-center mb-6">
                    <Image className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Ready to Create</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Enter a detailed prompt and watch as our AI transforms your words into stunning visual art
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;