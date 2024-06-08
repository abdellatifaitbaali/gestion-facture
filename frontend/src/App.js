import React, { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
//import './styles/App.css';  // Add this line if you have global styles

const App = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      <h1>My Application</h1>
      <button onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Go to Register' : 'Go to Login'}
      </button>
      {isLogin ? <Login /> : <Register />}
    </div>
  );
};

export default App;
