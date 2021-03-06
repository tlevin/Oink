import Budget from '../db/models/budget'
import Category from '../db/models/category'
import Budgets from '../db/collections/budgets'
import db from '../db/dbConfig.js'
import Transaction from '../db/models/transaction'
import Promise from 'bluebird'
import moment from 'moment'

// import apiController for message sending on budget update
import apiController from './apiController'

let budgetController = {
  findUserByID(userId) {
    return db.knex('users').where({id: userId}).select().then((user) => {
      return user
    })
  },

  getCategoryName(categoryId) {
    return db.knex('categories').where({id: categoryId}).select('description').then((description) => {
      return description
    })
  },

  createBudget(category, userId, amount) {
    // Search for category and retrieve category id
    return db.knex('categories').where({description: category}).select().then((category) => {
      let categoryId = category[0].id
      return db.knex('budgets').where({category_id: categoryId, user_id: userId}).then((result) => {
        if (result.length > 0) {
          return db.knex('budgets').where(result[0]).update({target: amount}).then((budget) => {
            budgetController.updateBudget(userId).then((response) => {
              return budget
            })
          })
        } else {
          let newBudget = {category_id: categoryId, user_id: userId, target: amount}
          return db.knex('budgets').insert(newBudget).then((budget) => {
            budgetController.updateBudget(userId).then((response) => {
              return budget
            })
          })
        }
      })
        
    })
  },

  deleteBudget(category, userId) {
    // Search for category and retrieve category id
    return db.knex('categories').where({description: category}).select().then((category) => {
      let categoryId = category[0].id
      return db.knex('budgets').where({category_id: categoryId, user_id: userId}).del().then((result) => {
        return result
      })
    })
  },

  getAllCategories() {
    // Return all categories in table
    return db.knex('categories').select('description').then((categories) => {
      if (categories) {
        // Convert to an array of descriptions
        return categories.map((category) => {
          return category.description
        })
      } else {
        return null
      }
    })
  },

  sumTransactionByCategoryMonthly(categoryId, userId) {
    // Return the sum of all transactions in a provided category
    return db.knex('transactions').where({category_id: categoryId, user_id: userId}).select().then((transactions)=> {
      let sum = 0
      return Promise.map(transactions, (transaction) => {
        if (transaction.date >= moment().startOf('month')) {
          sum += transaction.amount
        }
      }).then(() => {
        return sum
      })
    })
  },

  getBudgets(userId) {
    // Query budgets table
    return db.knex('budgets').from('budgets')

    // Joins to get category descriptions
    .innerJoin('categories', 'budgets.category_id', 'categories.id')

    // Only returns certain columns
    .select('description', 'target', 'actual')

    // Only gets budgets from specified user
    .where('user_id', userId).then((budgets) => {
      if (budgets) {
        return budgets
      } else {
        return null
      }
    })
  },

  checkTotalMonthlySpending(user) {
    // Sums the targets of all budgets for an user
    return db.knex('budgets').sum('target').where({user_id: user.id}).then((target)=> {
      // Sums the actuals
      return db.knex('budgets').sum('actual').where({user_id: user.id}).then((actual) => {
        // Send text if above budgets
        if (actual[0].sum > target[0].sum) {
          apiController.sendMessage('Oink Oink!! \n\nHey ' + user.first_name + ' looks like you have gone over your total budget for this month! \n \n Budget: $' + target[0].sum + ' \n Actual: $' + actual[0].sum, user.phone_number)
        }
      })
    })
  },

  checkMonthlySpendingByCategory(user) {
    return db.knex('budgets').where({user_id: user.id}).select().then((budget) => {
      // Iterates over all budgets
      return Promise.map(budget, (item) => {
        if (item.actual > item.target) {
          return budgetController.getCategoryName(item.category_id).then((description) => {
            // Text message to user when over budget in an individual category
            apiController.sendMessage('Oink Oink!! \n\nHey ' + user.first_name + ' looks like you have gone over your '
            + description[0].description + ' budget for this month! \n \n Budget: $' + item.target + ' \n Actual: $' + item.actual, user.phone_number)
          })
        }
      })
    })
  },

  updateBudget(userId) {
    // get budget for text
    return db.knex('budgets').where({user_id: userId}).select().then((budget) => {
      // loop through categories in budget
      return Promise.map(budget, (item, pos) => {
        // sum transactions for user in each category
        return budgetController.sumTransactionByCategoryMonthly(item.category_id, userId).then((sum) => {
          // update actual
          return db.knex('budgets').where({user_id: userId, category_id: item.category_id}).update({actual: sum}).then((response) => {
            return sum;
          })
        })
      })
    })
  },

  updateTransactions(transactions, user_id) {

    // pull previous transactions for user out of database
    return db.knex('transactions').where({user_id: user_id}).select('transaction_id').then((oldTransactions) => {
      // transform OldTransactions into an array of their transaction_Ids
      oldTransactions = oldTransactions.map((trans) => {
        return trans.transaction_id
      })

      // Find positon where new transactions start given that incoming transactions are in the same order each time
      let pos = 0
      while (transactions[pos] && !oldTransactions.includes(transactions[pos]._id)) {
        pos++
      }

      // update transaction array to only keep the transactions that have not already been added to database
      transactions = transactions.slice(0, pos)

      return Promise.map(transactions, (transaction) => {

        // If transaction is not assigned categories --> assign 'Other' to category
        let category = 'Other'

        if (transaction.category) {
          
          // We are only concerned with the first category listed
          category = transaction.category[0]
        }

        return db.knex('categories').where({description: category}).select().then((result) => {
          if (result.length > 0) {
            let category_id = result[0].id
            return saveTransaction(transaction, user_id, category_id)
          } else {
            return db.knex('categories').insert({description: category}).returning('id').then((result) => {
              let category_id = result[0].id
              return saveTransaction(transaction, user_id, category_id)
            })
          }
        })
      })
    })
  }
}

function saveTransaction(transaction, user_id, category_id) {
  let store
  let latitude
  let longitude
  let address
  let city
  let state

  if (transaction.meta.location) {
    if (transaction.meta.location.coordinates) {
      latitude = transaction.meta.location.coordinates.lat || 0.0
      longitude = transaction.meta.location.coordinates.lon || 0.0
    } else {
      latitude = 0.0
      longitude = 0.0
    }

    address = transaction.meta.location.address || ''
    city = transaction.meta.location.city || ''
    state = transaction.meta.location.state || ''
  } else {
    latitude = 0.0
    longitude = 0.0
    address = ''
    city = ''
    state = ''
  }

  store = transaction.name || ''

  let newTransaction = new Transaction({
    user_id: user_id,
    category_id: category_id,
    transaction_id: transaction._id,

    // this was erroring out so added a check
    amount: transaction.amount,
    date: new Date(transaction.date),
    pending: transaction.pending,
    store_name: store,
    latitude: latitude,
    longitude: longitude,
    address: address,
    city: city,
    state: state
  })

  // Saves to db
  return newTransaction.save().then((transaction) => {
    return transaction
  })

}

export default budgetController
