import { useState } from 'react';

export const useReports = (isLoggedIn) => {
  const [showReportsModal, setShowReportsModal] = useState(false);

  const handleReportsClick = () => {
    if (isLoggedIn) {
      // User is logged in, show reports (for now just scroll to reports section)
      document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // User is not logged in, show login prompt modal
      setShowReportsModal(true);
    }
  };

  const handleLoginFromReports = () => {
    setShowReportsModal(false);
    return true; // Signal that login modal should open
  };

  const closeReportsModal = () => {
    setShowReportsModal(false);
  };

  const handleCreateAccountFromReports = () => {
    setShowReportsModal(false);
    return { openLogin: true, isSignup: true }; // Signal that login modal should open in signup mode
  };

  return {
    showReportsModal,
    handleReportsClick,
    handleLoginFromReports,
    closeReportsModal,
    handleCreateAccountFromReports
  };
};
