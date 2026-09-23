import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { Sparkles, Send } from 'lucide-react-native';
import { ChatMessage } from '../types';

interface ChatViewProps {
  onAskAI: (query: string) => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ onAskAI, messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <View className="flex-1 bg-[#f8f9ff]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#eff4ff] bg-[#f8f9ff]">
        <View className="flex-1">
          <Text className="text-xs font-black text-[#2a14b4]">Family Care Channel</Text>
          <Text className="text-[9px] text-[#006a61] font-black uppercase mt-0.5">
            Mom, Dad, Suresh &amp; KinGuardian AI
          </Text>

        </View>

        <TouchableOpacity
          onPress={() => onAskAI('Summarize latest family care chat logs')}
          className="flex-row items-center gap-1 bg-[#4338ca]/10 px-3 py-1.5 rounded-full"
        >
          <Sparkles size={10} color="#4338ca" />
          <Text className="text-[9px] font-black text-[#4338ca] uppercase">AI Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Messages ScrollView */}
      <ScrollView className="flex-1 px-5 pt-4 space-y-4">
        {messages.map((m) => {
          const isMe = m.sender === 'user';
          const avatar =
            m.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
          const time = m.timestamp;
          const senderLabel = m.senderName;

          return (
            <View
              key={m.id}
              className={`flex-row gap-3 py-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Image
                source={{ uri: avatar }}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#dee9fc]"
              />
              <View className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                <View className="flex-row items-center gap-2 px-1">
                  <Text className="text-[9px] font-black text-slate-400">{senderLabel}</Text>
                  <Text className="text-[8px] text-slate-400 font-bold">{time}</Text>
                </View>
                <View
                  className={`p-3.5 rounded-2xl ${
                    isMe
                      ? 'bg-[#2a14b4] text-white rounded-tr-none'
                      : 'bg-white text-slate-800 rounded-tl-none border border-[#dee9fc]'
                  }`}
                >
                  <Text
                    className={`text-xs md:text-sm leading-relaxed ${isMe ? 'text-white' : 'text-slate-700'}`}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        {/* Padding for bottom input */}
        <View className="h-24" />
      </ScrollView>

      {/* Input bar */}
      <View className="absolute bottom-20 left-4 right-4 z-30 bg-white p-1 rounded-full shadow-lg border border-[#dee9fc] flex-row items-center">
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message family care group..."
          className="flex-1 px-4 py-2.5 text-xs text-slate-800 outline-none"
        />
        <TouchableOpacity
          onPress={handleSend}
          className="w-9 h-9 rounded-full bg-[#2a14b4] items-center justify-center shrink-0 active:scale-95"
        >
          <Send size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
