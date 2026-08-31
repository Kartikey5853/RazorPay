import React from 'react';
import GradientText from './GradientText';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true }) => {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {showText && (
                <GradientText
                    colors={["#4b41e1", "#091426", "#4b41e1", "#091426", "#4b41e1"]}
                    animationSpeed={5}
                    showBorder={false}
                    className="text-4xl font-extrabold tracking-tight m-0 px-2 py-1"
                >
                    Ergon
                </GradientText>
            )}
        </div>
    );
};
