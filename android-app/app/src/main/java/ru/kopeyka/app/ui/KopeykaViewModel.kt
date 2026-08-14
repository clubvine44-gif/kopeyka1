package ru.kopeyka.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import ru.kopeyka.app.data.TransactionRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class KopeykaViewModel(private val repository: TransactionRepository) : ViewModel() {
    val transactions = repository.transactions.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    fun add(date: String, type: String, category: String, amount: Long) = viewModelScope.launch {
        if (amount > 0) repository.add(date, type, category, amount)
    }
    fun delete(id: Long) = viewModelScope.launch { repository.delete(id) }
}
