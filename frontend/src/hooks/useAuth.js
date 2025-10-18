import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.js';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Listen for authentication state changes
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        console.log('✅ User authenticated:', user.email);
      } else {
        setIsLoggedIn(false);
        console.log('👤 User signed out');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginFormChange = (event) => {
    const { name, value } = event.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing (with a small delay to avoid flickering)
    if (error) {
      setTimeout(() => setError(''), 100);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLoginMode) {
        // Handle login logic with Firebase
        console.log('Login attempt:', { email: loginForm.email });
        
        if (!auth) {
          throw new Error('Firebase authentication is not available. Please check your configuration.');
        }

        await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
        
        // Success - auth state listener will handle login state
        setShowLoginModal(false);
        setLoginForm({ email: '', password: '', confirmPassword: '' });
        console.log('✅ Login successful');
        
      } else {
        // Handle signup logic with Firebase
        if (loginForm.password !== loginForm.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        console.log('Signup attempt:', { email: loginForm.email });
        
        if (!auth) {
          throw new Error('Firebase authentication is not available. Please check your configuration.');
        }

        await createUserWithEmailAndPassword(auth, loginForm.email, loginForm.password);
        
        // Success - auth state listener will handle login state
        setShowLoginModal(false);
        setLoginForm({ email: '', password: '', confirmPassword: '' });
        console.log('✅ Signup successful');
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'An error occurred during authentication.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'This sign-in method is not enabled.';
          break;
        default:
          // For any unhandled errors, show a more generic message
          console.log('Unhandled Firebase error:', error.code, error.message);
          errorMessage = 'Login failed. Please check your email and password and try again.';
      }
      
      setError(errorMessage);
      console.log('Setting error message:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLoginMode = () => {
    setIsLoginMode(!isLoginMode);
    setLoginForm({ email: '', password: '', confirmPassword: '' });
    setError(''); // Clear any errors when switching modes
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginForm({ email: '', password: '', confirmPassword: '' });
    setIsLoginMode(true);
    setError(''); // Clear any errors when closing modal
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        // Auth state listener will handle the logout state change
        console.log('✅ Logout successful');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  return {
    isLoggedIn,
    showLoginModal,
    isLoginMode,
    isLoading,
    error,
    loginForm,
    setIsLoginModal: setShowLoginModal,
    handleLoginFormChange,
    handleLoginSubmit,
    toggleLoginMode,
    closeLoginModal,
    handleLogout
  };
};
