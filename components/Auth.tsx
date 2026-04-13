
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { UserCircleIcon, GoogleIcon, LoaderIcon } from './Icons';

const Auth: React.FC = () => {
    const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState(''); // For signup display name
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuthAction = async (action: 'login' | 'signup' | 'google' | 'forgot') => {
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            switch(action) {
                case 'login':
                    await signInWithEmailAndPassword(auth, email, password);
                    // onAuthStateChanged in App.tsx will handle the rest
                    break;
                case 'signup':
                    if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
                    if (password !== confirmPassword) throw new Error('Passwords do not match.');
                    if (!username.trim()) throw new Error('Username cannot be empty.');

                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    if (userCredential.user) {
                        await updateProfile(userCredential.user, { displayName: username });
                    }
                    break;
                case 'google':
                    try {
                        await signInWithPopup(auth, googleProvider);
                    } catch (popupError: any) {
                        console.error("Google Auth Error:", popupError);
                        if (popupError.code === 'auth/popup-blocked') {
                            throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
                        } else if (popupError.code === 'auth/popup-closed-by-user') {
                            throw new Error('Sign-in cancelled.');
                        } else if (popupError.code === 'auth/cancelled-popup-request') {
                             throw new Error('Only one sign-in popup can be open at a time.');
                        } else if (popupError.code === 'auth/unauthorized-domain') {
                             const domain = window.location.hostname;
                             const displayDomain = domain || 'localhost';
                             throw new Error(`Domain not authorized. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add: ${displayDomain}`);
                        } else if (popupError.code === 'auth/operation-not-allowed') {
                             throw new Error('Google Sign-In is not enabled. Go to Firebase Console -> Authentication -> Sign-in method -> Google and enable it.');
                        } else {
                            throw popupError;
                        }
                    }
                    break;
                case 'forgot':
                    if (!email) throw new Error('Please enter your email address.');
                    await sendPasswordResetEmail(auth, email);
                    setMessage('Password reset email sent! Check your inbox.');
                    break;
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (view === 'login') handleAuthAction('login');
        if (view === 'signup') handleAuthAction('signup');
        if (view === 'forgot') handleAuthAction('forgot');
    };

    const switchView = (newView: 'login' | 'signup' | 'forgot') => {
        setError('');
        setMessage('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setUsername('');
        setView(newView);
    };

    const InputField = ({ label, type, value, onChange }: { label: string, type: string, value: string, onChange: (e: any) => void }) => (
        <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</label>
            <input 
                type={type} 
                value={value} 
                onChange={onChange} 
                required 
                className="w-full bg-white text-black border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-gray-400" 
            />
        </div>
    );

    const renderForm = () => {
        switch (view) {
            case 'signup':
                return (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField label="Username" type="text" value={username} onChange={e => setUsername(e.target.value)} />
                        <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                        <InputField label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        
                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white p-3 rounded-lg hover:bg-sky-400 font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-accent/20 mt-2">
                            {isLoading ? <LoaderIcon /> : 'Sign Up'}
                        </button>
                        <p className="text-center text-sm text-text-secondary mt-4">
                            Already have an account? <button type="button" onClick={() => switchView('login')} className="text-accent hover:text-white font-medium transition-colors">Log In</button>
                        </p>
                    </form>
                );
            case 'forgot':
                 return (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-center text-text-secondary mb-4">Enter your email and we'll send you a link to reset your password.</p>
                        <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        
                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white p-3 rounded-lg hover:bg-sky-400 font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-accent/20">
                            {isLoading ? <LoaderIcon /> : 'Send Reset Email'}
                        </button>
                        <p className="text-center text-sm mt-4">
                            <button type="button" onClick={() => switchView('login')} className="text-accent hover:text-white font-medium transition-colors">Back to Login</button>
                        </p>
                    </form>
                );
            default: // login
                return (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">Password</label>
                                <button type="button" onClick={() => switchView('forgot')} className="text-xs text-accent hover:text-white transition-colors">Forgot?</button>
                            </div>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                                className="w-full bg-white text-black border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-gray-400" 
                            />
                        </div>
                        
                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white p-3 rounded-lg hover:bg-sky-400 font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-accent/20 mt-2">
                            {isLoading ? <LoaderIcon /> : 'Log In'}
                        </button>
                        <p className="text-center text-sm text-text-secondary mt-4">
                            Don't have an account? <button type="button" onClick={() => switchView('signup')} className="text-accent hover:text-white font-medium transition-colors">Sign Up</button>
                        </p>
                    </form>
                );
        }
    };

    return (
        <div className="h-screen w-screen bg-primary text-text-primary flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                     <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-accent/20 mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                     </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Novel Helper</h1>
                    <p className="text-text-secondary mt-2">Focus on writing. We'll handle the rest.</p>
                </div>
                
                <div className="bg-secondary/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/5">
                    <h2 className="text-xl font-bold text-center mb-6 border-b border-white/5 pb-4">
                        {view === 'login' && 'Welcome Back'}
                        {view === 'signup' && 'Create Account'}
                        {view === 'forgot' && 'Reset Password'}
                    </h2>
                    
                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}
                    {message && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-3 rounded-lg mb-4 text-center">{message}</div>}
                    
                    {renderForm()}
                    
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                        <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="px-2 bg-secondary text-text-secondary">Or continue with</span></div>
                    </div>
                    
                    <button onClick={() => handleAuthAction('google')} disabled={isLoading} className="w-full bg-white text-gray-800 p-3 rounded-lg hover:bg-gray-100 font-medium flex items-center justify-center gap-3 transition-colors disabled:opacity-70">
                       {isLoading ? <LoaderIcon /> : <><GoogleIcon /> Google</>}
                    </button>
                </div>
                
                <p className="text-center text-xs text-text-secondary mt-8 opacity-50">
                    &copy; {new Date().getFullYear()} Ajinkya Novel Helper
                </p>
            </div>
        </div>
    );
};

export default Auth;
