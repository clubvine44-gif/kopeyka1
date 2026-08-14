package ru.kopeyka.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.kopeyka.app.data.KopeykaDb
import ru.kopeyka.app.data.TransactionModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val db = KopeykaDb(this)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    OfflineHome { db.add(TransactionModel(date = "today", type = "Расход", category = "Другое", amount = 0)) }
                }
            }
        }
    }
}

@Composable
private fun OfflineHome(onTestWrite: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Копейка", style = MaterialTheme.typography.headlineLarge)
        Text("Автономная версия", style = MaterialTheme.typography.titleMedium)
        Text("Данные сохраняются на телефоне даже без интернета. Синхронизация с облаком будет добавлена следующим слоем.")
        Button(onClick = onTestWrite) { Text("Проверить локальное сохранение") }
    }
}
