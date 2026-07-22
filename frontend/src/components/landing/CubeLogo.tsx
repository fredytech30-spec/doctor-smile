'use client';

import { HeartPulse, Brain, TrendingUp, Shield } from 'lucide-react';

export function CubeLogo() {
  return (
    <div className="cube-wrap-landing w-10 h-10">
      <div className="cube">
        <div className="cf cf-front">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div className="cf cf-back">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div className="cf cf-right">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div className="cf cf-left">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="cf cf-top">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div className="cf cf-bot">
          <Brain className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
