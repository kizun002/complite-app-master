import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, pointing, fetchActivities } from '@/utils/database';

// Define types
interface Question {
  question: string;
  options: string[];
  answer: string;
}

interface Activity {
  level: number;
  questions: Question[];
}

export default function StudActivity() {
  const [progress, setProgress] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [questionVisible, setQuestionVisible] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [levelQuestions, setLevelQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);

  // Fetch user profile and activities on component mount
  useEffect(() => {
    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const storedUserId = await AsyncStorage.getItem('userId');
            if (token && storedUserId) {
                setIsAuthenticated(true);
                setUserId(storedUserId);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    };
    
    checkAuth();
}, []);

  // Fetch User Profile
  const getUserProfile = async () => {
    try {
      const profile = await getProfile();
      setUserPoints(profile.points || 0);
      setProgress(profile.progress || 0);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Load activities from the database
  const loadActivities = async () => {
    try {
      const result = await fetchActivities();
      if (result.success) {
        setActivities(result.activities as Activity[]);

        // Set initial level if activities exist
        if (result.activities.length > 0) {
          setCurrentLevel(1);
        }
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Failed to load activities', error);
      Alert.alert('Error', 'Could not load activities');
    }
  };

  // Start Level (Opens Modal)
  const startLevel = (level: number) => {
    const selectedLevel = activities.find((l) => l.level === level);
    if (selectedLevel) {
      setLevelQuestions(selectedLevel.questions);
      setCurrentQuestionIndex(0);
      setCurrentQuestion(selectedLevel.questions[0]);
      setQuestionVisible(true);
    }
  };

  // Validate Answer
 const checkAnswer = async (selectedOption: string) => {
    if (selectedOption === currentQuestion?.answer) {
        const pointsToAdd = 50;
        
        try {
            const accountId = await AsyncStorage.setItem('accountId', Response.data.account_ID.toString());
            if (!accountId) {
                Alert.alert('Error', 'Please log in again');
                return;
            }

            await pointing({
                points: pointsToAdd,
                activityType: 'study'
                // account_ID will be added in the pointing function
            });
            
            setUserPoints(userPoints + pointsToAdd);
            Alert.alert('Correct!', 'You answered correctly 🎉');

            // Move to next question or finish level
            if (currentQuestionIndex + 1 < levelQuestions.length) {
                const nextQuestionIndex = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextQuestionIndex);
                setCurrentQuestion(levelQuestions[nextQuestionIndex]);
            } else {
                // Level Complete
                setProgress(progress + 1 / activities.length);
                setCurrentLevel(currentLevel + 1);
                Alert.alert('Level Complete!', `You've completed Level ${currentLevel} 🎖️`);
                setQuestionVisible(false);
            }
        } catch (error) {
            console.error('Failed to save points:', error);
            Alert.alert('Error', 'Failed to save points, but your answer was correct!');
        }
    } else {
        Alert.alert('Oops!', 'Wrong answer. Try again!');
    }
  };

  // Save points to AsyncStorage
  const recordPoints = async () => {
    try {
      await AsyncStorage.setItem('userPoints', JSON.stringify(userPoints));
    } catch (error) {
      console.error('Failed to save points:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={{ color: '#F5F4F6', fontSize: 24, fontWeight: 'bold' }}>
            Activities
          </Text>
          <View style={styles.headerItem}>
            <Text style={styles.headerText}>{userPoints} Points</Text>
          </View>
        </View>
      </View>

      {/* Levels - Step-wise Layout */}
      <ScrollView contentContainerStyle={styles.levelContainer}>
        {activities.map((levelData) => (
          <View key={levelData.level} style={styles.levelWrapper}>
            <TouchableOpacity
              style={[
                styles.levelCircle,
                levelData.level > currentLevel && styles.lockedLevel,
              ]}
              disabled={levelData.level > currentLevel}
              onPress={() => startLevel(levelData.level)}
            >
              {levelData.level <= currentLevel ? (
                <Ionicons name="lock-open" size={24} color="#FCD200" />
              ) : (
                <Ionicons name="lock-closed" size={24} color="#232946" />
              )}
              <Text style={styles.levelText}>
                {levelData.level <= currentLevel
                  ? `Level ${levelData.level}`
                  : 'Locked'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Question Modal */}
      <Modal
        visible={questionVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQuestionVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>
            {currentQuestion?.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => checkAnswer(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4F6' },
  header: { flexDirection: 'row', paddingVertical: 20, backgroundColor: '#2C2C4E' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerItem: { backgroundColor: '#F5F4F6', padding: 5, borderRadius: 50 },
  headerText: { color: '#232946', fontSize: 16, fontWeight: 'bold' },
  levelContainer: { alignItems: 'center' },
  levelWrapper: { alignItems: 'center', marginVertical: 10 },
  levelCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedLevel: { backgroundColor: '#444' },
  levelText: { color: '#FCD200', marginTop: 5 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#232946', padding: 20, borderRadius: 10, width: '80%' },
  questionText: { color: '#F5F4F6', fontSize: 18, marginBottom: 10 },
  optionButton: { backgroundColor: '#FCD200', padding: 10, marginVertical: 5, borderRadius: 5 },
  optionText: { color: '#232945', textAlign: 'center' },
});