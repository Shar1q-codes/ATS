"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Upload,
  Briefcase,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

function OnboardingContent() {
  const { user } = useAuth();
  const router = useRouter();

  const steps = [
    {
      title: "Upload Your First Resume",
      description: "Experience our AI-powered resume parsing",
      icon: Upload,
      href: "/candidates/upload",
      color: "bg-blue-500",
    },
    {
      title: "Create a Job Posting",
      description: "Set up your first job with our variation model",
      icon: Briefcase,
      href: "/jobs",
      color: "bg-green-500",
    },
    {
      title: "Explore Candidates",
      description: "See how our AI matching works",
      icon: Users,
      href: "/candidates",
      color: "bg-purple-500",
    },
    {
      title: "View Analytics",
      description: "Check out your recruitment insights",
      icon: BarChart3,
      href: "/analytics",
      color: "bg-orange-500",
    },
  ];

  const handleSkipOnboarding = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-blue-600" />
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Welcome to AI-Native ATS
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome, {user?.firstName}!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Let's get you started with the most advanced recruitment platform.
              Follow these steps to explore our key features.
            </p>
          </div>

          {/* Onboarding Steps */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {steps.map((step, index) => (
              <Link key={index} href={step.href}>
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 ${step.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <step.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {step.title}
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

          {/* Features Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center">
                What Makes Us Different
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Explainable AI</h3>
                  <p className="text-sm text-gray-600">
                    Get detailed explanations for every candidate match with
                    transparent scoring
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Zero Duplication</h3>
                  <p className="text-sm text-gray-600">
                    Create job templates once, customize for multiple companies
                    effortlessly
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Advanced Analytics</h3>
                  <p className="text-sm text-gray-600">
                    Track performance, identify bias, and optimize your hiring
                    process
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/candidates/upload">
              <Button size="lg" className="w-full sm:w-auto">
                <Upload className="h-5 w-5 mr-2" />
                Start with Resume Upload
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleSkipOnboarding}
              className="w-full sm:w-auto"
            >
              Skip to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}
