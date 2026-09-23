import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FormattedTextProps {
  text: string;
  isUser?: boolean;
  baseClassName?: string;
  boldClassName?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  text,
  isUser = false,
  baseClassName = '',
  boldClassName = ''
}) => {
  if (!text) return null;

  // Split text into paragraphs by double newlines
  const paragraphs = text.split(/\n\n+/);

  return (
    <View style={styles.container}>
      {paragraphs.map((paragraph, pIdx) => {
        const lines = paragraph.split('\n');

        return (
          <View
            key={`p-${pIdx}`}
            style={[styles.paragraph, pIdx < paragraphs.length - 1 ? styles.paragraphSpacing : null]}
          >
            {lines.map((line, lIdx) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;

              const isBullet =
                trimmedLine.startsWith('•') ||
                trimmedLine.startsWith('- ') ||
                trimmedLine.startsWith('* ') ||
                /^\d+\.\s/.test(trimmedLine);

              let bulletPrefix = '•';
              let lineContent = trimmedLine;

              if (/^\d+\.\s/.test(trimmedLine)) {
                const match = trimmedLine.match(/^(\d+\.)\s*(.*)$/);
                if (match) {
                  bulletPrefix = match[1];
                  lineContent = match[2];
                }
              } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                lineContent = trimmedLine.replace(/^[•\-\*]\s*/, '');
              }

              // Parse **bold** parts
              const parts = lineContent.split(/(\*\*[^*]+\*\*)/g);

              return (
                <View
                  key={`l-${lIdx}`}
                  style={[
                    isBullet ? styles.bulletRow : styles.normalRow,
                    lIdx < lines.length - 1 ? styles.lineSpacing : null
                  ]}
                >
                  {isBullet && (
                    <Text
                      style={[
                        styles.bulletPoint,
                        isUser ? styles.userBullet : styles.aiBullet,
                        bulletPrefix.length > 1 ? styles.numberBullet : null
                      ]}
                    >
                      {bulletPrefix}
                    </Text>
                  )}
                  <Text
                    className={`${baseClassName} ${isUser ? 'text-white' : 'text-slate-800'}`}
                    style={[styles.baseText, isUser ? styles.userText : styles.aiText]}
                  >
                    {parts.map((part, partIdx) => {
                      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                        const boldContent = part.slice(2, -2);
                        return (
                          <Text
                            key={`b-${partIdx}`}
                            className={`${boldClassName} ${isUser ? 'text-white font-black' : 'text-slate-950 font-black'}`}
                            style={styles.boldText}
                          >
                            {boldContent}
                          </Text>
                        );
                      }
                      return (
                        <Text key={`t-${partIdx}`}>
                          {part}
                        </Text>
                      );
                    })}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  paragraph: {
    width: '100%'
  },
  paragraphSpacing: {
    marginBottom: 10
  },
  lineSpacing: {
    marginBottom: 4
  },
  normalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 2
  },
  bulletPoint: {
    fontSize: 12,
    lineHeight: 18,
    marginRight: 6,
    fontWeight: '700'
  },
  numberBullet: {
    minWidth: 16
  },
  userBullet: {
    color: '#ffffff'
  },
  aiBullet: {
    color: '#7c3aed'
  },
  baseText: {
    fontSize: 12.5,
    lineHeight: 19,
    flex: 1
  },
  userText: {
    color: '#ffffff',
    fontWeight: '500'
  },
  aiText: {
    color: '#1e293b',
    fontWeight: '400'
  },
  boldText: {
    fontWeight: '800',
    color: '#0f172a'
  }
});
