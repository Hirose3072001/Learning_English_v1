import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './hooks/useAuth';

// Layout Components
import TopBar from './components/TopBar';

// Screens
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import LearnScreen from './screens/LearnScreen';
import GameScreen from './screens/GameScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import QuestsScreen from './screens/QuestsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LessonScreen from './screens/LessonScreen';
import FlashcardsScreen from './screens/FlashcardsScreen';
import WordDefenseScreen from './screens/WordDefenseScreen';
import WordRunnerScreen from './screens/WordRunnerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#58CC02',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarStyle: {
          borderTopWidth: 2,
          borderTopColor: '#e5e5e5',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Learn"
        component={LearnScreen}
        options={{
          title: 'Học',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Game"
        component={GameScreen}
        options={{
          title: 'Game',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Xếp hạng',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Quests"
        component={QuestsScreen}
        options={{
          title: 'Nhiệm vụ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function MainAppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <TopBar />
      <MainTabs />
    </View>
  );
}

function NavigationRoot() {
  const { session, loading } = useAuth();

  if (loading) return null; // Or a splash screen

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          // Authenticated Screens
          <>
            <Stack.Screen name="Main" component={MainAppLayout} />
            <Stack.Screen name="Lesson" component={LessonScreen} />
            <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
            <Stack.Screen name="WordDefense" component={WordDefenseScreen} />
            <Stack.Screen name="WordRunner" component={WordRunnerScreen} />
          </>
        ) : (
          // Unauthenticated Screens
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationRoot />
    </QueryClientProvider>
  );
}
