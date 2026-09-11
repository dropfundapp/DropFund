import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateCampaign } from '../hooks/useQueries';
import { usePrivyAuth } from '../components/PrivyAuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { api } from '@/lib/api';

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { authenticated, solanaAddress, getAccessToken } = usePrivyAuth();
  const createCampaign = useCreateCampaign();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('30');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Set thumbnail size to 400x300 or maintain aspect ratio
        const maxWidth = 400;
        const maxHeight = 300;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const thumbnailUrl = canvas.toDataURL('image/webp', 0.8); // Compress to 80% quality, now WebP
        resolve(thumbnailUrl);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const validateSolanaAddress = (address: string): boolean => {
    // Solana addresses are base58-encoded and 32-44 characters long
    // Base58 alphabet: [1-9A-HJ-NP-Za-km-z] (no 0, O, I, l)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authenticated || !solanaAddress) {
      toast.error('Please sign in first so we can prepare your DropFund wallet.');
      return;
    }
    const walletAddress = solanaAddress;

    if (!title.trim() || !description.trim() || !goal) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!imageFile) {
      toast.error('Please upload a campaign image');
      return;
    }

    const goalNum = parseFloat(goal);
    if (goalNum <= 0) {
      toast.error('Goal must be greater than 0');
      return;
    }

    // Validate Solana wallet address before submission
    if (!walletAddress || !validateSolanaAddress(walletAddress)) {
      toast.error('Invalid Solana wallet address format');
      console.error('Invalid wallet address:', walletAddress);
      return;
    }

    try {
      setIsUploading(true);

      // Convert file to base64 data URL for storage
      // Compress main image to WebP
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          const maxWidth = 1600;
          const maxHeight = 1200;
          const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const webpDataUrl = canvas.toDataURL('image/webp', 0.72);
          resolve(webpDataUrl);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(imageFile);
      });

      // Generate thumbnail
      let thumbnailUrl = imageDataUrl; // Default to full image
      try {
        thumbnailUrl = await generateThumbnail(imageFile);
        console.log('Generated thumbnail URL length:', thumbnailUrl.length);
        console.log('Thumbnail URL starts with:', thumbnailUrl.substring(0, 50));
      } catch (error) {
        console.warn('Thumbnail generation failed, using full image:', error);
      }

      const goalUsdcUnits = Math.floor(goalNum * 1000000);
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');
      const uploadedImage = await api.uploadCampaignImage(imageDataUrl, walletAddress, token);
      const uploadedThumbnail = await api.uploadCampaignImage(thumbnailUrl, walletAddress, token);
      
      console.log('Creating campaign with creator wallet:', walletAddress);
      
      const campaignId = await createCampaign.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        goal: BigInt(goalUsdcUnits),
        duration: BigInt(duration),
        imageUrl: uploadedImage.imageUrl,
        thumbnailUrl: uploadedThumbnail.imageUrl,
        creatorWalletAddress: walletAddress!, // Use connected Solana wallet address (guaranteed string)
        websiteUrl: websiteUrl.trim() || null,
        twitterUrl: twitterUrl.trim() || null,
        telegramUrl: telegramUrl.trim() || null,
      });

      toast.success('Campaign created successfully!');
      navigate({ to: '/campaign/$campaignId', params: { campaignId } });
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('Non-base58') || error.message?.includes('Invalid Solana')) {
        toast.error('Your DropFund wallet address is not valid. Please sign in again.');
      } else if (error.message?.includes('Unauthorized')) {
        toast.error('Unauthorized. Please try reconnecting your wallet.');
      } else {
        toast.error(error.message || 'Failed to create campaign. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="container py-12">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Create a Campaign</CardTitle>
          <CardDescription>
            Launch your crowdfunding campaign and start receiving donations in USDC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="text-xs text-muted-foreground">Creator Wallet Address</div>
              <div className="font-mono text-xs break-all">{solanaAddress || 'Sign in to create your wallet'}</div>
              <p className="text-xs text-muted-foreground pt-1">
                Donations will be sent to this wallet address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Campaign Title *</Label>
              <Input
                id="title"
                placeholder="Enter a compelling title for your campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your campaign, what you're building, and why people should support you"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{description.length}/1000 characters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="goal">Funding Goal (USDC) *</Label>
                <Input
                  id="goal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Campaign Duration *</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="0">No end date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="text-sm font-medium mb-3">Social Links (Optional)</h3>
                <p className="text-xs text-muted-foreground mb-4">Add links to your website and social media</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="URL"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  type="url"
                  placeholder="URL"
                  value={twitterUrl}
                  onChange={(e) => setTwitterUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram</Label>
                <Input
                  id="telegram"
                  type="url"
                  placeholder="URL"
                  value={telegramUrl}
                  onChange={(e) => setTelegramUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Campaign Image *</Label>
              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={imagePreview}
                      alt="Campaign preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {imageFile?.name} ({(imageFile!.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full aspect-[4/3] border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                  >
                    <div className="flex flex-col items-center justify-center py-8">
                      <Upload className="h-12 w-12 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm font-medium text-foreground">
                        Click to upload campaign image
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full" 
                disabled={createCampaign.isPending || !imageFile || isUploading}
              >
                {isUploading || createCampaign.isPending ? 'Creating Campaign...' : 'Launch Campaign'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
