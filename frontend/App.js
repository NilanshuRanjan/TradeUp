import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthLoadingScreen from './src/screens/AuthLoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import MyListingsScreen from './src/screens/MyListingsScreen';
import ChatScreen from './src/screens/ChatScreen';
import SellerInboxScreen from './src/screens/SellerInboxScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkStatus from './src/components/NetworkStatus';
import { setAuthErrorHandler } from './src/services/api';
import { colors } from './src/utils/theme';

const AuthStack = createStackNavigator();
const MainStack = createStackNavigator();
const RootStack = createStackNavigator();

const commonScreenOptions = {
  headerStyle: {
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleStyle: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.textPrimary,
  },
  headerTintColor: colors.primary,
  headerBackTitleVisible: false,
};

// Authentication Stack - for non-authenticated users
const AuthStackScreen = () => (
  <AuthStack.Navigator screenOptions={commonScreenOptions}>
    <AuthStack.Screen 
      name="Login" 
      component={LoginScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen 
      name="SignUp" 
      component={SignUpScreen}
      options={{ headerShown: false }}
    />
  </AuthStack.Navigator>
);

// Main Stack - for authenticated users
const MainStackScreen = () => (
  <MainStack.Navigator screenOptions={commonScreenOptions}>
    <MainStack.Screen 
      name="Home" 
      component={HomeScreen}
      options={{ 
        title: 'TradeUp',
        headerShown: false, // HomeScreen renders its own rich branded header
      }}
    />
    <MainStack.Screen 
      name="ListingDetail" 
      component={ListingDetailScreen}
      options={{ title: 'Item Details' }}
    />
    <MainStack.Screen 
      name="CreateListing" 
      component={CreateListingScreen}
      options={{ title: 'Create Listing' }}
    />
    <MainStack.Screen 
      name="MyListings" 
      component={MyListingsScreen}
      options={{ title: 'My Listings' }}
    />
    <MainStack.Screen 
      name="Chat" 
      component={ChatScreen}
      options={{ title: 'Chat' }}
    />
    <MainStack.Screen
      name="SellerInbox"
      component={SellerInboxScreen}
      options={{ title: 'Messages from Buyers' }}
    />
  </MainStack.Navigator>
);

// Root Stack - handles initial loading and stack switching
const App = () => {
  const navigationRef = useRef(null);

  // Register the global auth-error handler so api.js can redirect to Login
  // whenever the access token cannot be refreshed (session truly expired).
  useEffect(() => {
    setAuthErrorHandler(() => {
      navigationRef.current?.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    });
  }, []);

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navigationRef}>
        <NetworkStatus />
        <RootStack.Navigator 
          initialRouteName="AuthLoading"
          screenOptions={{ headerShown: false }}
        >
          <RootStack.Screen 
            name="AuthLoading" 
            component={AuthLoadingScreen}
          />
          <RootStack.Screen 
            name="Auth" 
            component={AuthStackScreen}
          />
          <RootStack.Screen 
            name="Main" 
            component={MainStackScreen}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default App;
