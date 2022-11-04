const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

let threadId, replyId, testPass = 'testing'

chai.use(chaiHttp);

suite('Functional Tests', function() {
  test('Creating a new thread => POST', done => {
    chai.request(server)
      .post('/api/threads/test')
      .send({
        board: 'test',
        text: 'test thread',
        delete_password: testPass
      })
      .end((req, res) => {
        assert.equal(res.status, 200)
        assert.equal(res.redirects[0].split('/')[4], 'test')
        done()
      })
  })

  test('Viewing the 10 most recent threads with 3 replies each => GET', done => {
    chai.request(server)
      .get('/api/threads/test')
      .send()
      .end((err, res) => {
        assert.isArray(res.body)
        let firstThread = res.body[0]

        assert.isUndefined(firstThread.delete_password)
        assert.isUndefined(firstThread.reported)
        assert.isAtMost(firstThread.replies.length, 3)

        threadId = firstThread._id
        done()
      })
  })

  test('Creating a new reply => POST', done => {
    chai.request(server)
      .post('/api/replies/test')
      .send({
        thread_id: threadId,
        text: 'Test Reply',
        delete_password: testPass
      })
      .end((err, res) => {
        assert.equal(res.status, 200)
        done()
      })
  })

  test('Viewing a single thread with all replies => GET', done => {
    chai.request(server)
      .get('/api/replies/test')
      .query({
        thread_id: threadId
      })
      .end((err, res) => {
        let thread = res.body
        assert.equal(thread._id, threadId)
        assert.isUndefined(thread.delete_password)
        assert.isArray(thread.replies)
        replyId = thread.replies[0]._id
        done()
      })
  })

  test('Reporting a thread => PUT', done => {
    chai.request(server)
      .put('/api/threads/test')
      .send({
        report_id: threadId
      })
      .end((err, res) => {
        assert.equal(res.text, 'reported')
        done()
      })
  })

  test('Reporting a reply => PUT', done => {
    chai.request(server)
      .put('/api/replies/test')
      .send({
        thread_id: threadId,
        reply_id: replyId
      })
      .end((err, res) => {
        assert.equal(res.text, 'reported')
        done()
      })
  })

  test('Deleting a reply with the incorrect password => DELETE', done => {
    chai.request(server)
      .delete('/api/replies/test')
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'wrong password'
      })
      .end((err, res) => {
        assert.equal(res.text, 'incorrect password')
        done()
      })
  })

  test('Deleting a reply with the correct password => DELETE', done => {
    chai.request(server)
      .delete('/api/replies/test')
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: testPass
      })
      .end((err, res) => {
        assert.equal(res.text, 'success')
        done()
      })
  })

  test('Deleting a thread with the incorrect password => DELETE', done => {
    chai.request(server)
      .delete('/api/threads/test')
      .send({
        thread_id: threadId,
        delete_password: 'wrong password'
      })
      .end((err, res) => {
        assert.equal(res.text, 'incorrect password')
        done()
      })
  })

  test('Deleting a thread with the correct password => DELETE', done => {
    chai.request(server)
      .delete('/api/threads/test')
      .send({
        thread_id: threadId,
        delete_password: testPass
      })
      .end((err, res) => {
        assert.equal(res.text, 'success')
        done()
      })
  })


});
