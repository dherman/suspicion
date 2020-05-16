import { expect } from "chai";
import "mocha";
import * as path from "path";

import { spawn } from "../src/suspicion";

describe("spawning", () => {
  it("should do basic expectations", (done) => {
    spawn("echo", ["hello"]).expect("hello").run((err: Error, stdout: string[]) => {
      expect(err, err ? err.message : "").to.equal(undefined);
      expect(stdout).to.deep.equal(["hello"]);
      done();
    });
  });

  it("should check stderr if specified", (done) => {
    spawn("ls", ["-la", "undefined"], { stream: "stderr" })
      .wait(/No such file or directory/)
      .run((err: Error, stdout: string[]) => {
        expect(err, err ? err.message : "").to.equal(undefined);
        expect(stdout).to.be.an("Array");
        done();
      });
  });

  it("should error on non-existant commands", (done) => {
    spawn("idontexist").expect("This will never work").run((err: Error) => {
      expect(err).not.to.equal(undefined);
      done();
    });
  });

  it("should use sendline", (done) => {
    spawn("node", ["--interactive"])
      .expect(">")
      .sendline("console.log('testing')")
      .expect("testing")
      .sendline("process.exit()")
      .run((err: Error) => {
        expect(err, err ? err.message : "").to.equal(undefined);
        done();
      });
  });

  it("should do regexp expectations", (done) => {
    spawn("echo", ["hello"]).expect(/^hello$/).run((err: Error, stdout: string[]) => {
      expect(err, err ? err.message : "").to.equal(undefined);
      expect(stdout).to.deep.equal(["hello"]);
      done();
    });
  });

  it("should successfully use wait", (done) => {
    spawn(path.join(__dirname, "fixtures", "prompt-and-respond"))
      .wait("first")
      .sendline("first-prompt")
      .expect("first-prompt")
      .wait("second")
      .sendline("second-prompt")
      .expect("second-prompt")
      .run((err: Error) => {
        expect(err, err ? err.message : "").to.equal(undefined);
        done();
      });
  });

  it("should fail with unmet waits", (done) => {
    spawn(path.join(__dirname, "fixtures", "prompt-and-respond"))
      .wait("first")
      .sendline("first-prompt")
      .expect("first-prompt")
      .wait("second")
      .sendline("second-prompt")
      .wait("this-never-shows-up")
      .run((err: Error) => {
        expect(err).not.to.equal(undefined);
        done();
      });
  });

  it("should call wait callbacks", (done) => {
    let called = false;
    function callback(data: string) {
      expect(data).to.include("first");
      called = true;
    }
    spawn(path.join(__dirname, "fixtures", "prompt-and-respond"))
      .wait("first", callback)
      .sendline("first-prompt")
      .expect("first-prompt")
      .wait("second")
      .sendline("second-prompt")
      .wait("this-never-shows-up")
      .run((err: Error) => {
        expect(err).not.to.equal(undefined);
        expect(called).to.equal(true);
        done();
      });
  });

  it("should not call wait callbacks on non-matches", (done) => {
    let called = false;
    function callback() {
      called = true;
    }
    spawn(path.join(__dirname, "fixtures", "prompt-and-respond"))
      .wait("first")
      .sendline("first-prompt")
      .expect("first-prompt")
      .wait("second")
      .sendline("second-prompt")
      .wait("this-never-shows-up", callback)
      .run((err: Error) => {
        expect(err).not.to.equal(undefined);
        expect(called).to.equal(false);
        done();
      });
  });

  it("should work with terminal colors", (done) => {
    spawn(path.join(__dirname, "fixtures", "log-colors"))
      .wait("second has colors")
      .expect("third has colors")
      .run((err: Error) => {
        expect(err, err ? err.message : "").to.equal(undefined);
        done();
      });
  });

  it("should pass spawn options", (done) => {
    spawn(path.join(__dirname, "fixtures", "show-env"), [], { env: { foo: "bar", PATH: process.env.PATH } })
      .expect("foo=bar")
      .run((err: Error) => {
        expect(err, err ? err.message : "").to.equal(undefined);
        done();
      });
  });

  it("should work with spaces when shell: true", (done) => {
    spawn(`"${path.join(__dirname, "fixtures", "test spaces")}"`, ["'hi there'"], { shell: true })
      .wait("hi there")
      .run((err: Error) => {
        expect(err, err ? err.message : "").to.equal(undefined);
        done();
      });
  });
});
