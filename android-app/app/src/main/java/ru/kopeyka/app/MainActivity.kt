package ru.kopeyka.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.kopeyka.app.data.KopeykaDb
import ru.kopeyka.app.data.TransactionModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val db = KopeykaDb(this)
        setContent {
            MaterialTheme { Surface(Modifier.fillMaxSize()) { OfflineHome(db) } }
        }
    }
}

@Composable
private fun OfflineHome(db: KopeykaDb) {
    var amountText by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("Расход") }
    var rows by remember { mutableStateOf(db.observeAll()) }
    val income = rows.filter { it.type == "Доход" }.sumOf { it.amount }
    val expense = rows.filter { it.type == "Расход" }.sumOf { it.amount }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Копейка", style = MaterialTheme.typography.headlineLarge)
        Text("Работает без интернета", style = MaterialTheme.typography.titleMedium)
        Text("Баланс: ${income - expense} ₽", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(value = amountText, onValueChange = { amountText = it.filter(Char::isDigit) }, label = { Text("Сумма, ₽") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { type = "Расход" }) { Text("Расход") }
            Button(onClick = { type = "Доход" }) { Text("Доход") }
            Button(onClick = {
                val amount = amountText.toLongOrNull() ?: 0L
                if (amount > 0) {
                    db.add(TransactionModel(date = java.time.LocalDate.now().toString(), type = type, category = "Другое", amount = amount))
                    rows = db.observeAll()
                    amountText = ""
                }
            }) { Text("Добавить") }
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rows, key = { it.id }) { item ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text("${item.type}: ${item.amount} ₽")
                        Text("${item.date} · ${item.category}")
                    }
                }
            }
        }
    }
}
