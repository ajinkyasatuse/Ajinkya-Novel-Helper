import React from 'react';
import { LoaderIcon } from './Icons';

interface SkeletonLoaderProps {
    loading: boolean;
    error: Error | null;
    onRetry?: () => void;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ loading, error, onRetry }) => {
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-red-500/10 p-4 rounded-full mb-4">
                    <LoaderIcon className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Data Load Failed</h3>
                <p className="text-sm text-slate-400 max-w-xs mb-6">
                    We couldn't fetch your project data. Please check your connection.
                </p>
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        Attempt Recovery
                    </button>
                )}
            </div>
        );
    }

    if (!loading) return null;

    return (
        <div className="w-full h-full p-8 space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-8 bg-slate-800 rounded w-1/3"></div>
                <div className="flex gap-2">
                    <div className="h-8 w-8 bg-slate-800 rounded-full"></div>
                    <div className="h-8 w-24 bg-slate-800 rounded"></div>
                </div>
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar */}
                <div className="col-span-1 space-y-4">
                    <div className="h-40 bg-slate-800 rounded-xl"></div>
                    <div className="h-20 bg-slate-800 rounded-xl"></div>
                    <div className="h-60 bg-slate-800 rounded-xl"></div>
                </div>

                {/* Main Content */}
                <div className="col-span-2 space-y-4">
                    <div className="h-12 bg-slate-800 rounded-lg w-3/4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-4/5"></div>
                    </div>
                    <div className="h-64 bg-slate-800 rounded-xl mt-8"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonLoader;
