import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Ellipse, G } from 'react-native-svg';

type OwlMascotProps = {
  size?: number;
  className?: string;
};

/**
 * Kitabını okuyan, gözlüklü sevimli bilge baykuş illüstrasyonu.
 * SVG vektör çizimidir, renkler soft mavi/slate tonlarındadır.
 */
export function OwlMascot({ size = 120, className }: OwlMascotProps) {
  return (
    <View className={className} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        {/* Kitap (altta) */}
        <G>
          {/* Kitap arka kapağı */}
          <Rect x="45" y="135" width="110" height="40" rx="4" fill="#3B82F6" opacity="0.15" />
          {/* Kitap sayfaları */}
          <Rect x="48" y="132" width="104" height="36" rx="3" fill="#FFFFFF" />
          {/* Kitap ortası çizgisi */}
          <Path d="M100 132 L100 168" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Kitap satırları - sol sayfa */}
          <Path d="M58 142 L92 142" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M58 150 L88 150" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M58 158 L90 158" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          {/* Kitap satırları - sağ sayfa */}
          <Path d="M108 142 L142 142" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M108 150 L138 150" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M108 158 L140 158" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />
        </G>

        {/* Baykuş gövdesi */}
        <Ellipse cx="100" cy="100" rx="48" ry="52" fill="#60A5FA" opacity="0.25" />
        <Ellipse cx="100" cy="100" rx="44" ry="48" fill="#DBEAFE" />

        {/* Baykuş göğsü (daha açık tüy) */}
        <Ellipse cx="100" cy="115" rx="28" ry="32" fill="#EFF6FF" />

        {/* Kanatlar */}
        <Path
          d="M58 95 Q50 110 56 130 Q62 125 66 115 Q64 105 58 95 Z"
          fill="#93C5FD"
          opacity="0.7"
        />
        <Path
          d="M142 95 Q150 110 144 130 Q138 125 134 115 Q136 105 142 95 Z"
          fill="#93C5FD"
          opacity="0.7"
        />

        {/* Kulak püskülleri */}
        <Path d="M72 62 L68 48 L80 58 Z" fill="#93C5FD" opacity="0.8" />
        <Path d="M128 62 L132 48 L120 58 Z" fill="#93C5FD" opacity="0.8" />

        {/* Gözler - beyaz dış halka */}
        <Circle cx="82" cy="88" r="16" fill="#FFFFFF" />
        <Circle cx="118" cy="88" r="16" fill="#FFFFFF" />

        {/* Göz bebekleri */}
        <Circle cx="82" cy="90" r="9" fill="#1E293B" />
        <Circle cx="118" cy="90" r="9" fill="#1E293B" />

        {/* Göz parlaması */}
        <Circle cx="85" cy="86" r="3" fill="#FFFFFF" />
        <Circle cx="121" cy="86" r="3" fill="#FFFFFF" />

        {/* Gözlük çerçevesi */}
        <Circle cx="82" cy="88" r="18" stroke="#3B82F6" strokeWidth="2.5" fill="none" opacity="0.6" />
        <Circle cx="118" cy="88" r="18" stroke="#3B82F6" strokeWidth="2.5" fill="none" opacity="0.6" />
        {/* Gözlük köprüsü */}
        <Path d="M100 88 Q100 84 100 84" stroke="#3B82F6" strokeWidth="2.5" opacity="0.6" />
        <Path d="M96 86 L104 86" stroke="#3B82F6" strokeWidth="2.5" opacity="0.6" />

        {/* Gaga */}
        <Path d="M94 104 L100 112 L106 104 Z" fill="#F59E0B" opacity="0.8" />

        {/* Ayaklar (kitabın üstünde) */}
        <Path d="M88 148 L84 156 M88 148 L88 158 M88 148 L92 156" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <Path d="M112 148 L108 156 M112 148 L112 158 M112 148 L116 156" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      </Svg>
    </View>
  );
}