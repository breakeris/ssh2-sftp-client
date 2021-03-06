'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {
  config,
  getConnection,
  closeConnection,
  makeLocalPath,
  makeRemotePath
} = require('./hooks/global-hooks');
const fs = require('fs');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('uploadDir tests', function() {
  let sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('UploadDir setup hook', async function() {
    sftp = await getConnection('upload');
    return true;
  });

  after('UploadDir clenaup hook', async function() {
    await closeConnection('upload', sftp);
    return true;
  });

  it('Upload directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Uploaded top-level files', async function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      {name: 'file2.txt.gz', type: '-', size: 570314},
      {name: 'sub1', type: 'd'},
      {name: 'sub3', type: 'd'},
      {name: 'file1.txt', type: '-'}
    ]);
  });
});

describe('Partial file upload', function() {
  let sftpHook, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('UploadDir setup hook', async function() {
    sftpHook = await getConnection('upload-hook');
    sftp = await getConnection('upload');
    let remotePath = makeRemotePath(config.sftpUrl, 'upload-test', 'sub1');
    await sftpHook.rmdir(remotePath, true);
    return true;
  });

  after('UploadDir clenaup hook', async function() {
    await closeConnection('upload', sftp);
    await closeConnection('upload-hook', sftpHook);
    return true;
  });

  it('Upload directory 2', function() {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.eventually.equal(
      `${localDir} uploaded to ${remoteDir}`
    );
  });

  it('Uploaded sub-directory files', async function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test', 'sub1');
    let fileList = await sftp.list(remoteDir);
    return expect(fileList).to.containSubset([
      {name: 'sub2', type: 'd'},
      {name: 'file4.txt.gz', type: '-', size: 570314},
      {name: 'file3.txt', type: '-'}
    ]);
  });
});

describe('Uploaddir bad path tests', function() {
  let sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('UploadDir bad path setup hook', async function() {
    sftp = await getConnection('upload');
    return true;
  });

  after('UploadDir clenaup hook', async function() {
    await closeConnection('upload', sftp);
    return true;
  });

  it('Non-existent source directory is rejected', function() {
    let localDir = makeLocalPath(config.localUrl, 'no-such-dir');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /No such directory/
    );
  });

  it('Source directory is a file rejected', function() {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /Bad path/
    );
  });

  it('Destination directory is a file rejected', function() {
    let localDir = makeLocalPath(config.localUrl, 'upload-src');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test', 'file1.txt');
    return expect(sftp.uploadDir(localDir, remoteDir)).to.be.rejectedWith(
      /Bad path/
    );
  });
});

describe('Download directory', function() {
  let sftp, sftpHook;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Download directory setup hook', async function() {
    sftp = await getConnection('download');
    sftpHook = await getConnection('download-hook');
    return true;
  });

  after('download directory clenaup hook', async function() {
    await closeConnection('download', sftp);
    await closeConnection('download-hook', sftpHook);
    return true;
  });

  it('Download directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.downloadDir(remoteDir, localDir)).to.eventually.equal(
      `${remoteDir} downloaded to ${localDir}`
    );
  });

  it('Bad src directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'not-needed');
    let remoteDir = makeRemotePath(config.sftpUrl, 'no-such-dir');
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith(
      'No such directory'
    );
  });

  it('Bad dst directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'test-file1.txt');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.downloadDir(remoteDir, localDir)).to.be.rejectedWith(
      'Bad path'
    );
  });
});

describe('Partial download dir', function() {
  let sftp, sftpHook;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('Download directory setup hook', async function() {
    sftp = await getConnection('download');
    sftpHook = await getConnection('download-hook');
    let localDir = makeLocalPath(config.localUrl, 'download-test', 'sub1');
    fs.rmdirSync(localDir, {recursive: true});
    return true;
  });

  after('download directory clenaup hook', async function() {
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    await sftpHook.rmdir(remoteDir, true);
    fs.rmdirSync(localDir, {recursive: true});
    await closeConnection('download', sftp);
    await closeConnection('download-hook', sftpHook);
    return true;
  });

  it('Download partial directory', function() {
    let localDir = makeLocalPath(config.localUrl, 'download-test');
    let remoteDir = makeRemotePath(config.sftpUrl, 'upload-test');
    return expect(sftp.downloadDir(remoteDir, localDir)).to.eventually.equal(
      `${remoteDir} downloaded to ${localDir}`
    );
  });
});
