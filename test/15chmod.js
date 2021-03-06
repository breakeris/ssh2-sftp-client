'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {chmodSetup, chmodCleanup} = require('./hooks/chmod-hooks');
const {makeRemotePath} = require('./hooks/global-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('chmod() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('chmod setup hook', async function() {
    hookSftp = await getConnection('chmod-hook');
    sftp = await getConnection('chmod');
    await chmodSetup(hookSftp, config.sftpUrl);
    return true;
  });

  after('chmod cleanup hook', async function() {
    await chmodCleanup(hookSftp, config.sftpUrl);
    await closeConnection('chmod', sftp);
    await closeConnection('chmod-hook', hookSftp);
    return true;
  });

  it('chmod should return a promise', function() {
    return expect(
      sftp.chmod(makeRemotePath(config.sftpUrl, 'chmod-test.txt'), 0o444)
    ).to.be.a('promise');
  });

  it('chmod on a file reports correct mode', function() {
    return sftp
      .chmod(makeRemotePath(config.sftpUrl, 'chmod-test.txt'), 0o777)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'chmod-test.txt',
            rights: {
              user: 'rwx',
              group: 'rwx',
              other: 'rwx'
            }
          }
        ]);
      });
  });

  it('chmod on a directory reports correct mode', function() {
    return sftp
      .chmod(makeRemotePath(config.sftpUrl, 'chmod-test-dir'), 0o444)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'chmod-test-dir',
            rights: {
              user: 'r',
              group: 'r',
              other: 'r'
            }
          }
        ]);
      });
  });

  it('chmod on non-existent file is rejecterd', function() {
    return expect(
      sftp.chmod(makeRemotePath(config.sftpUrl, 'does-not-exist.txt'), 0o777)
    ).to.be.rejectedWith('No such file');
  });

  it('chmod on a relative file path 1', function() {
    return sftp
      .chmod('./testServer/chmod-test.txt', 0o111)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'chmod-test.txt',
            rights: {
              user: 'x',
              group: 'x',
              other: 'x'
            }
          }
        ]);
      });
  });

  it('chmod on relative file path 2', function() {
    return sftp
      .chmod(`../${config.username}/testServer/chmod-test.txt`, 0o600)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'chmod-test.txt',
            rights: {
              user: 'rw',
              group: '',
              other: ''
            }
          }
        ]);
      });
  });

  it('chmod on relative path dir 3', function() {
    return sftp
      .chmod('./testServer/chmod-test-dir', 0o222)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'chmod-test-dir',
            rights: {
              user: 'w',
              group: 'w',
              other: 'w'
            }
          }
        ]);
      });
  });

  it('chmod on relative path dir 4', function() {
    return sftp
      .chmod(`../${config.username}/testServer/chmod-test-dir`, 0o777)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then(list => {
        return expect(list).to.containSubset([
          {
            name: 'chmod-test-dir',
            rights: {
              user: 'rwx',
              group: 'rwx',
              other: 'rwx'
            }
          }
        ]);
      });
  });
});
