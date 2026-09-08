import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { ArrowRight, User, Users, Shield, Zap, Handshake, HardDrive } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Hero Section */}
        <div className="text-left mb-8">
          <h1 className="text-[2rem] md:text-[3rem] font-bold mb-6 text-white">
            How dropfund works
          </h1>
        </div>

        {/* Main Steps */}
        <div className="space-y-8 mb-8">
          <Card className="p-4 rounded-[1.4rem]">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#4b54ff] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  1
                </div>
                <CardTitle className="text-2xl">Create your campaign</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set up your crowdfunding campaign with a compelling story, funding goal, and timeline. Our platform guides you through the process with smart defaults and validation.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 rounded-[1.4rem]">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#4b54ff] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  2
                </div>
                <CardTitle className="text-2xl">Share & promote</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect your social media accounts and share updates with your community. Add your social links to keep supporters engaged and build trust.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 rounded-[1.4rem]">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#4b54ff] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  3
                </div>
                <CardTitle className="text-2xl">Receive donations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Accept donations securely through Solana blockchain. All transactions are transparent, instant, and recorded immutably on-chain.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-8">Getting started</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-4 rounded-[1.4rem]">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-8 h-8 text-[#4b54ff] mr-3" strokeWidth={1} />
                  For creators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Sign in with Privy to get started
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Fill out your campaign details and set funding goals
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Upload compelling images and write your story
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Set campaign duration and launch
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-4 rounded-[1.4rem]">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-8 h-8 text-[#4b54ff] mr-3" strokeWidth={1} />
                  For supporters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Browse campaigns that interest you
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Your embedded wallets are secured by Privy
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Choose donation amount and contribute
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-[#4b54ff] flex-shrink-0" />
                    Track campaign progress in real-time
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technology Section */}
        <div className="space-y-8 mb-8">
        {/* Technology Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-center mb-8">Powered by blockchain</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-4 rounded-[1.4rem]">
              <CardContent className="pt-6">
                <div className="text-left mb-4">
                  <User className="w-8 h-8 text-[#4b54ff] mb-3" />
                  <p className="text-muted-foreground"><span className="font-semibold text-[#4b54ff]">DropFund platform</span> provides the campaign experience while Solana settles USDC donations transparently on-chain.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4 rounded-[1.4rem]">
              <CardContent className="pt-6">
                <div className="text-left mb-4">
                  <img src="/solana-logo.png" alt="Solana Logo" className="w-8 h-8 object-contain mb-3" />
                  <p className="text-muted-foreground"><span className="font-semibold text-purple-600">Solana blockchain</span> enables fast, low-cost transactions for donations and ensures all funds are handled securely and transparently.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="p-4 rounded-[1.4rem]">
              <CardContent className="pt-6">
                <div className="text-left mb-4">
                  <HardDrive className="w-8 h-8 text-green-600 mb-3" />
                  <p className="text-muted-foreground"><span className="font-semibold text-green-600">Decentralized storage</span> ensures all campaign data and images are stored immutably across the network, providing censorship resistance.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

          <Card className="p-4 rounded-[1.4rem]">
            <CardContent className="pt-8">
              <h2 className="text-3xl font-bold mb-6">Why choose dropfund?</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-[#4b54ff] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Full transparency</h3>
                    <p className="text-muted-foreground">Every transaction is visible on-chain, building trust between creators and supporters.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Zap className="w-5 h-5 text-[#4b54ff] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Lightning fast</h3>
                    <p className="text-muted-foreground">Solana's high throughput ensures instant donations and real-time campaign updates.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Handshake className="w-5 h-5 text-[#4b54ff] mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">No middlemen</h3>
                    <p className="text-muted-foreground">Direct creator-supporter relationships with minimal fees and maximum control.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="p-4 rounded-[1.4rem]">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of creators and supporters building the future together on Dropfund.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="w-64">
                  <Link to="/create" onClick={() => window.scrollTo(0, 0)}>
                    Start a Campaign
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="secondary" asChild size="lg" className="w-64 bg-white text-black hover:bg-white/90">
                  <Link to="/">
                    Browse Campaigns
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}