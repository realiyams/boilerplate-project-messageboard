const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Model = mongoose.model
'use strict';

module.exports = function (app) {

  const connect = mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true})
  
  const replySchema = new Schema({
    text: {type: String, required: true},
    delete_password: {type: String, required: true},
    created_on: {type: Date, required: true},
    reported: {type: Boolean, required: true}
  })

  const threadSchema = new Schema({
    text: {type: String, required: true},
    delete_password: {type: String, required: true},
    board: {type: String, required: true},
    created_on: {type: Date, required: true},
    bumped_on: {type: Date, required: true},
    reported: {type: Boolean, required: true},
    replies: [replySchema]
  })

  const reply = Model('Reply', replySchema)
  const thread = Model('Thread', threadSchema)

  app.route('/api/threads/:board')
  
  .get((req, res) => {
    const { board } = req.params

    thread.find({board: board})
      .sort({bumped_on: 'desc'})
      .limit(10)
      .select({_id: 1, text: 1, created_on: 1, bumped_on: 1, replies: 1})
      .lean()
      .exec((err, arrOfThreads) => {
        if (!err && arrOfThreads) {
          arrOfThreads.forEach(singleThread => {
            // singleThread['replycount'] = singleThread.replies.length

            singleThread.replies.sort((reply1, reply2) => {
              return reply2.created_on - reply1.created_on
            })

            singleThread.replies = singleThread.replies.slice(0, 3)

            singleThread.replies.forEach((reply) => {
              reply.delete_password = undefined
              reply.reported = undefined
            })
          })

          return res.json(arrOfThreads)
        }
      })
  })

  .post((req, res) => {
    const newThread = new thread(req.body)

    if (!newThread.board || newThread.board === '')
      newThread.board  = req.params.board

    newThread.created_on = new Date()
    newThread.bumped_on = new Date()
    newThread.reported = false
    newThread.replies = []

    newThread.save((err, savedThread) => {
      if (!err && savedThread)
        return res.redirect('/b/' + savedThread.board) 
    })
  })
  
  .put((req, res) => {
    const thread_id = req.body.report_id

    thread.findByIdAndUpdate(
      thread_id,
      {reported: true},
      {new: true},
      (err, updated) => {
        if (!err && updated)
          return res.send('reported')
      }
    )
  })
  
  .delete((req, res) => {
    const { thread_id, delete_password } = req.body

    thread.findById(
      thread_id,
      (err, threadToDelete) => {
        if (err || !threadToDelete)
          return res.send('thread not found')

        if (threadToDelete.delete_password !== delete_password)
          return res.send('incorrect password')
        
        thread.findByIdAndRemove(thread_id, (err, success) => {
          if (!err && success)
            return res.send('success')
        })
      }
    )
  });
    
  app.route('/api/replies/:board')
  
  .get((req, res) => {
    const { thread_id } = req.query

    thread.findById(thread_id)
      .select({_id: 1, text: 1, created_on: 1, bumped_on: 1, replies: 1})
      .exec((err, thread) => {
        if (!err && thread) {
          // thread['replycount'] = thread.replies.length

          thread.replies.sort((reply1, reply2) => {
            return reply2.created_on - reply1.created_on
          })
  
          thread.replies.forEach(reply => {
            reply.delete_password = undefined
            reply.reported = undefined
          })
  
          return res.json(thread)
        }
      })
  })

  .post((req, res) => {
    const { thread_id } = req.body
    const newReply = new reply(req.body)

    newReply.created_on = new Date()
    newReply.reported = false

    thread.findByIdAndUpdate(
      thread_id,
      {
        $push: {replies: newReply},
        bumped_on: new Date()
      },
      {new: true},
      (err, updatedThread) => {
        if (!err, updatedThread)
          res.redirect('/b/' + updatedThread.board + '/' + thread_id)
      }
    )
  })
  
  .put((req, res) => {
    const { thread_id, reply_id } = req.body

    thread.findById(
      thread_id,
      (err, threadToUpdate) => {
        for (let i = 0; i < threadToUpdate.replies.length; i++)
          if (threadToUpdate.replies[i]._id == reply_id) {
            threadToUpdate.replies[i].reported = true

            threadToUpdate.save((err, updated) => {
              if (!err && updated)
                return res.send('reported')
            })
          }
      }
    )
  })
  
  .delete((req, res) => {
    const { thread_id, reply_id, delete_password } = req.body
    
    thread.findById(
      thread_id,
      (err, threadToUpdate) => {
        if (err || !threadToUpdate)
          return res.json('thread not found')

        for (let i = 0; i < threadToUpdate.replies.length; i++)
          if (threadToUpdate.replies[i]._id == reply_id)
            if (threadToUpdate.replies[i].delete_password === delete_password){
              threadToUpdate.replies[i].text = '[deleted]'

              threadToUpdate.save((err, updated) => {
                if (!err && updated)
                  return res.send('success')
              })
            } else return res.send('incorrect password')
          else return res.send('reply not found')
        
      }
    )
  });
};
