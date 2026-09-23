import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, UserPlus, Shield, ChevronRight, Mail, Lock, User, AlertCircle } from 'lucide-react-native';
import { authService } from '../../src/services/auth/authService';

export default function SignInRoute() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coordinator' | 'parent'>('coordinator');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = () => {
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async () => {
    clearError();

    if (!email.trim()) {
      const msg = 'Please enter your email address or username.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') Alert.alert('Missing details', msg);
      return;
    }

    if (isRegistering && !name.trim()) {
      const msg = 'Please enter your full name.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') Alert.alert('Missing details', msg);
      return;
    }

    if (!password.trim()) {
      const msg = 'Please enter your password.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') Alert.alert('Missing details', msg);
      return;
    }

    if (isRegistering && password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') Alert.alert('Weak password', msg);
      return;
    }

    setLoading(true);
    try {
      let session;
      if (isRegistering) {
        session = await authService.register(
          name.trim(),
          email.trim(),
          password,
          role,
          'Asia/Kolkata'
        );
      } else {
        session = await authService.login(
          email.trim(),
          password
        );
      }

      const userRole = session.user.role;

      if (userRole === 'parent') {
        router.replace('/(parent)');
      } else {
        router.replace('/(coordinator)');
      }
    } catch (err: any) {
      const errorDetail = err?.message || 'Invalid email or password. Please verify credentials.';
      setErrorMessage(errorDetail);
      if (Platform.OS !== 'web') {
        Alert.alert('Authentication Error', errorDetail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gradient-to-b from-blue-50 via-white to-blue-50"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-6 py-8"
      >
        {/* Header / Logo Section */}
        <View className="items-center mt-8 mb-8">
          <View className="w-16 h-16 rounded-full bg-[#eff6ff] items-center justify-center shadow-xs border border-blue-100 mb-2">
            <Text className="text-3xl">🛡️</Text>
          </View>
          <Text className="text-3xl font-bold text-neutral-900 mt-2 tracking-tight">
            KinGuardian
          </Text>
          <Text className="text-sm text-neutral-500 text-center mt-2 leading-relaxed">
            {isRegistering
              ? 'Join your family healthcare coordination circle'
              : 'Welcome back to your family care dashboard'}
          </Text>
        </View>

        {/* Auth Card */}
        <View className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-100/50 border border-blue-50">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
              {isRegistering ? <UserPlus size={20} color="#007aff" /> : <LogIn size={20} color="#007aff" />}
            </View>
            <View>
              <Text className="text-xl font-bold text-neutral-900">
                {isRegistering ? 'Create Account' : 'Sign In'}
              </Text>
              <Text className="text-xs text-neutral-400">
                {isRegistering ? 'Join the KinGuardian family' : 'Access your dashboard'}
              </Text>
            </View>
          </View>

          {/* Visual Error Message Banner */}
          {errorMessage && (
            <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex-row items-center">
              <AlertCircle size={18} color="#ef4444" className="mr-2" />
              <Text className="flex-1 ml-2 text-xs text-red-700 font-medium leading-tight">
                {errorMessage}
              </Text>
            </View>
          )}

          {isRegistering && (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-neutral-600 mb-2 ml-1">Full Name</Text>
              <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5">
                <User size={18} color="#9ca3af" />
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    clearError();
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-3 text-sm text-neutral-800"
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Quick Demo Credentials */}
          {!isRegistering && (
            <View className="mb-5 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <Text className="text-[11px] font-semibold text-blue-900 mb-2">
                Quick Test Accounts (tap to fill):
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setEmail('pranjalchirmade09326@gmail.com');
                    setPassword('pranjal123');
                    clearError();
                  }}
                  className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl shadow-xs"
                >
                  <Text className="text-[11px] font-semibold text-blue-700">Pranjal (Coordinator)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEmail('ram123@gmail.com');
                    setPassword('ram123');
                    clearError();
                  }}
                  className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl shadow-xs"
                >
                  <Text className="text-[11px] font-semibold text-blue-700">Ram (Coordinator)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEmail('vandana123@gmail.com');
                    setPassword('vandana123');
                    clearError();
                  }}
                  className="px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl shadow-xs"
                >
                  <Text className="text-[11px] font-semibold text-emerald-700">Vandana (Parent)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-xs font-semibold text-neutral-600 mb-2 ml-1">Email Address or Username</Text>
            <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5">
              <Mail size={18} color="#9ca3af" />
              <TextInput
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  clearError();
                }}
                placeholder="e.g. ram123@gmail.com or ram"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 ml-3 text-sm text-neutral-800"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-xs font-semibold text-neutral-600 mb-2 ml-1">Password</Text>
            <View className="flex-row items-center bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3.5">
              <Lock size={18} color="#9ca3af" />
              <TextInput
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  clearError();
                }}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                className="flex-1 ml-3 text-sm text-neutral-800"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                <Shield size={18} color={showPassword ? "#007aff" : "#9ca3af"} />
              </TouchableOpacity>
            </View>
          </View>

          {isRegistering && (
            <View className="mb-6">
              <Text className="text-xs font-semibold text-neutral-600 mb-2 ml-1">I am a</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setRole('coordinator')}
                  className={`flex-1 py-3.5 rounded-2xl items-center border-2 ${
                    role === 'coordinator' 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${
                    role === 'coordinator' ? 'text-blue-600' : 'text-neutral-500'
                  }`}>
                    Coordinator
                  </Text>
                  <Text className={`text-[10px] ${
                    role === 'coordinator' ? 'text-blue-400' : 'text-neutral-400'
                  }`}>
                    Manage family care
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRole('parent')}
                  className={`flex-1 py-3.5 rounded-2xl items-center border-2 ${
                    role === 'parent' 
                      ? 'bg-emerald-50 border-emerald-500' 
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${
                    role === 'parent' ? 'text-emerald-600' : 'text-neutral-500'
                  }`}>
                    Parent
                  </Text>
                  <Text className={`text-[10px] ${
                    role === 'parent' ? 'text-emerald-400' : 'text-neutral-400'
                  }`}>
                    Receive care
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity 
            disabled={loading} 
            onPress={handleSubmit}
            className={`bg-gradient-to-r from-blue-500 to-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-200 ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-sm font-bold mr-2">
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </Text>
                <ChevronRight size={18} color="white" />
              </View>
            )}
          </TouchableOpacity>

          {/* Toggle Sign In / Sign Up */}
          <View className="mt-6 pt-4 border-t border-neutral-100">
            <TouchableOpacity 
              onPress={() => {
                clearError();
                setIsRegistering(!isRegistering);
              }}
              className="items-center py-2"
            >
              <Text className="text-sm font-semibold text-blue-600">
                {isRegistering 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Create one"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-6 items-center">
          <TouchableOpacity 
            onPress={() => router.replace('/(auth)/welcome')}
            className="flex-row items-center"
          >
            <Text className="text-xs text-neutral-400 mr-1">Back to welcome</Text>
            <ChevronRight size={14} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View className="mt-8 items-center">
          <Text className="text-[10px] text-neutral-300">KinGuardian v1.0.0</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
