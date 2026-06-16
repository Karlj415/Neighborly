import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import apartmentImg from "@assets/image_1753409568359.png";

const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces")
    .trim(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const { confirmPassword, ...signupData } = data;
      const response = await apiRequest("POST", "/api/auth/signup", signupData);
      return response.json();
    },
    onSuccess: async (result, variables) => {
      toast({
        title: "Account created successfully",
        description: "Welcome to Proptech! Logging you in...",
      });
      
      // Automatically log in the user with their credentials
      try {
        await apiRequest("POST", "/api/auth/login", {
          email: variables.email,
          password: variables.password,
        });
        
        // Invalidate auth cache to refetch user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      } catch (error) {
        // If auto-login fails, redirect to login page
        setTimeout(() => {
          setLocation("/login");
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Signup failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  return (
    <div 
      className="min-h-screen bg-gray-900 flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: `url(${apartmentImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/")}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Liquid glass card */}
      <Card className="w-full max-w-md mx-4 my-12 bg-white/5 backdrop-blur-md border border-white/20 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-3xl font-bold text-white mb-2">Create Account</CardTitle>
          <p className="text-gray-300">Join Neighborly to find your perfect home</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  id="firstName"
                  type="text"
                  placeholder="First name"
                  className="flex h-10 w-full rounded-md border backdrop-blur-sm py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-[15px] pr-[15px]"
                  {...form.register("firstName")}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-400">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  className="flex h-10 w-full rounded-md border backdrop-blur-sm py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-[15px] pr-[15px]"
                  {...form.register("lastName")}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-400">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="flex h-10 w-full rounded-md border backdrop-blur-sm py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-[15px] pr-[15px]"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="flex h-10 w-full rounded-md border backdrop-blur-sm py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-[15px] pr-[15px]"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="flex h-10 w-full rounded-md border backdrop-blur-sm py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-[15px] pr-[15px]"
                  {...form.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-red-400">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white">Password requirements:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>At least 8 characters long</li>
                  <li>One uppercase letter (A-Z)</li>
                  <li>One lowercase letter (a-z)</li>
                  <li>One number (0-9)</li>
                  <li>One special character (!@#$%^&*)</li>
                </ul>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}