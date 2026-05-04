import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { OcrResultScreen } from '../screens/OcrResultScreen';
import { ExpenseResultScreen } from '../screens/ExpenseResultScreen';
import { FileHistoryScreen } from '../screens/FileHistoryScreen';
import { FileUploadScreen } from '../screens/FileUploadScreen';
import { PendingFilesScreen } from '../screens/PendingFilesScreen';

export type RootStackParamList = {
	Login: undefined;
	Home: undefined;
	/** 第一段：仅文件上传（写 documents 待处理） */
	FileUpload: undefined;
	/** 第二段入口：服务端待处理列表 */
	PendingFiles: undefined;
	/** 处理页（无参=新建一步式；带 documentId=两段式第二段） */
	Upload:
		| {
				documentId?: string;
				fileName?: string;
				fileType?: string;
				projectId?: string | null;
				docType?: string | null;
		  }
		| undefined;
	OcrResult: {
		invoiceId: string;
		fileName?: string;
	};
	ExpenseResult: {
		expenseId: string;
		documentId?: string;
		fileName?: string;
	};
	FileHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
	const { ready, token } = useAuth();

	if (!ready) return null;

	return (
		<NavigationContainer key={token ? 'authenticated' : 'unauthenticated'}>
			<Stack.Navigator
				screenOptions={{
					headerTitleAlign: 'center'
				}}
				initialRouteName={token ? 'Home' : 'Login'}
			>
				<Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
				<Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SmartFin' }} />
				<Stack.Screen
					name="FileUpload"
					component={FileUploadScreen}
					options={{ title: '上传 / 拍照' }}
				/>
				<Stack.Screen
					name="PendingFiles"
					component={PendingFilesScreen}
					options={{ title: '待处理记录' }}
				/>
				<Stack.Screen name="Upload" component={UploadScreen} options={{ title: '费用录入 (OCR)' }} />
				<Stack.Screen name="OcrResult" component={OcrResultScreen} options={{ title: 'OCR / 分析' }} />
				<Stack.Screen name="ExpenseResult" component={ExpenseResultScreen} options={{ title: '已保存' }} />
				<Stack.Screen name="FileHistory" component={FileHistoryScreen} options={{ title: '上传记录' }} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}
