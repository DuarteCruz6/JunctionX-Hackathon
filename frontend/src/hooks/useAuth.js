import { useState } from 'react';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginFormChange = (event) => {
    const { name, value } = event.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    if (isLoginMode) {
      // Handle login logic here
      console.log('Login attempt:', { email: loginForm.email, password: loginForm.password });
      // For now, just close the modal and set user as logged in
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '', confirmPassword: '' });
    } else {
      // Handle signup logic here
      if (loginForm.password !== loginForm.confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      console.log('Signup attempt:', loginForm);
      // For now, just close the modal and set user as logged in
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '', confirmPassword: '' });
    }
  };

  const toggleLoginMode = () => {
    setIsLoginMode(!isLoginMode);
    setLoginForm({ email: '', password: '', confirmPassword: '' });
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginForm({ email: '', password: '', confirmPassword: '' });
    setIsLoginMode(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return {
    isLoggedIn,
    showLoginModal,
    isLoginMode,
    loginForm,
    setIsLoginModal: setShowLoginModal,
    handleLoginFormChange,
    handleLoginSubmit,
    toggleLoginMode,
    closeLoginModal,
    handleLogout
  };
};
