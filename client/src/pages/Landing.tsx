import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Trophy,
  TrendingUp,
  Shield,
  Search,
  Star,
  Award,
  CreditCard,
} from "lucide-react";
import blueApartmentImage from "@assets/image_1753410116212.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  const handleSignup = () => {
    window.location.href = "/signup";
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${blueApartmentImage})`,
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-600/30 to-blue-700/40" />

      {/* Header */}
      <header className="relative z-10 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
            </div>
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-6">
                <a
                  href="#"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Home
                </a>
                <a
                  href="#"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  About
                </a>
                <a
                  href="#"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  Contact
                </a>
              </nav>
              <Button
                onClick={handleLogin}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all"
                size="sm"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative z-10 flex items-center justify-center"
        style={{
          height: "calc(100vh - 36px)",
          margin: "36px",
          marginTop: "36px",
        }}
      >
        <div className="text-center w-full h-full">
          {/* Main Content Card with Liquid Glass Effect */}
          <div className="relative w-full h-full">
            {/* Liquid Glass Background */}
            <div className="absolute inset-0 bg-white/5 rounded-3xl border border-white/10 shadow-xl" />

            {/* Content */}
            <div className="relative px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 h-full flex flex-col justify-center">
              {/* Main Title */}
              <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold text-white mb-8 leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent drop-shadow-2xl">
                  NEIGHBORLY
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl sm:text-2xl lg:text-3xl text-white/90 mb-12 leading-relaxed font-light drop-shadow-lg">
                Let's find a home that's perfect for you
              </p>

              {/* CTA Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleSignup}
                  size="lg"
                  className="bg-gradient-to-r from-blue-100 to-blue-500 hover:from-blue-200 hover:to-blue-600 text-blue-900 text-lg px-8 py-3 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 font-semibold border-2 border-white/20 w-auto"
                >
                  Get Started Free
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
