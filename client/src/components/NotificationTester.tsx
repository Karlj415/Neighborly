import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertTriangle, Zap, Trophy } from "lucide-react";
import GoLiveButton from "./GoLiveButton";

export default function NotificationTester() {
  const [activeNotifications, setActiveNotifications] = useState<string[]>([]);

  const triggerProgressNotification = () => {
    // Force show progress notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 max-w-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4 border border-blue-300';
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="bg-yellow-400 rounded-full p-1">
          <div class="h-4 w-4 text-blue-900">🏆</div>
        </div>
        <div class="flex-1">
          <h4 class="font-semibold text-sm mb-1">Almost There! 🎯</h4>
          <p class="text-xs text-blue-100 mb-3">You're 25 points away from Local status!</p>
          <button class="bg-yellow-400 text-blue-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-yellow-300 transition-colors flex items-center gap-1">
            ⚡ Track Progress (+5 pts)
          </button>
        </div>
        <button class="text-blue-200 hover:text-white transition-colors" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  };

  const triggerLossAversionNotification = () => {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-20 left-4 right-4 z-50 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg shadow-lg p-4 border border-red-300';
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="bg-yellow-400 rounded-full p-1">
          <div class="h-4 w-4 text-red-900">⚠️</div>
        </div>
        <div class="flex-1">
          <h4 class="font-semibold text-sm mb-1 flex items-center gap-1">
            🕐 Points Expiring Soon! ⏰
          </h4>
          <p class="text-xs text-red-100 mb-3">You have 150 points expiring in 3 days. Use them before you lose them!</p>
          <div class="flex gap-2">
            <button class="bg-yellow-400 text-red-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-yellow-300 transition-colors">
              Redeem Now
            </button>
            <button class="bg-transparent border border-red-200 text-red-100 px-3 py-1 rounded-md text-xs hover:bg-red-400 transition-colors">
              Remind Later
            </button>
          </div>
        </div>
        <button class="text-red-200 hover:text-white transition-colors" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  };

  const triggerDoublePointsChallenge = () => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-4 right-4 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-4 border border-blue-300';
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="bg-yellow-400 rounded-full p-1 animate-pulse">
          <div class="h-4 w-4 text-blue-900">⚡</div>
        </div>
        <div class="flex-1">
          <h4 class="font-bold text-sm mb-1 flex items-center gap-1">
            🎯 🔥 2X POINTS CHALLENGE!
          </h4>
          <p class="text-xs text-blue-100 mb-2">Complete any action and earn DOUBLE points! Limited time only.</p>
          <div class="flex items-center gap-2 mb-3">
            <div class="h-3 w-3 text-yellow-400">🕐</div>
            <span class="text-xs font-mono bg-black/20 px-2 py-1 rounded">23:45:12</span>
          </div>
          <div class="flex gap-2">
            <button class="bg-yellow-400 text-blue-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-yellow-300 transition-colors">
              Create Post (+60 pts)
            </button>
            <button class="bg-white/20 text-white px-3 py-1 rounded-md text-xs hover:bg-white/30 transition-colors">
              Search Properties (+100 pts)
            </button>
          </div>
        </div>
        <button class="text-blue-200 hover:text-white transition-colors" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  };

  return (
    <Card className="fixed bottom-4 left-4 w-80 z-50 bg-white shadow-xl border-2 border-blue-300">
      <CardHeader className="pb-2 bg-blue-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Notification Testing Buttons */}
        
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full text-xs"
          onClick={triggerProgressNotification}
        >
          <Trophy className="h-3 w-3 mr-1" />
          Progress Notification
        </Button>
        
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full text-xs"
          onClick={triggerLossAversionNotification}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Loss Aversion Alert
        </Button>
        
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full text-xs"
          onClick={triggerDoublePointsChallenge}
        >
          <Zap className="h-3 w-3 mr-1" />
          Double Points Challenge
        </Button>
        
        <p className="text-xs text-gray-500 mt-2">
          Click buttons to test notifications. Auto-dismiss in 10s.
        </p>
      </CardContent>
    </Card>
  );
}