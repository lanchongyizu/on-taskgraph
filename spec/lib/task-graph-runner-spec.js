// Copyright 2015, EMC, Inc.
/* jshint node:true */

'use strict';

describe('TaskGraph.Runner', function () {
    var di = require('di');
    var core = require('on-core')(di, __dirname);
    var servicesCore;
    var TaskScheduler;
    var LeaseExpirationPoller;
    var taskMessenger;
    var loader;
    var CompletedTaskPoller;
    var serviceGraph;
    var store;
    var taskGraphRunner;
    var sandbox;

    function mockConsul() {
        return {
            agent: {
                service: {
                    list: sinon.stub().resolves({}),
                    register: sinon.stub().resolves({}),
                    deregister: sinon.stub().resolves({})
                }
            }
        };
    }

    before('setup depedencies', function() {
        var injectables = [
            helper.requireGlob('/lib/*.js'),
            helper.requireGlob('/lib/services/*.js'),
            helper.require('/api/rpc/index.js'),
            helper.di.simpleWrapper(mockConsul, 'consul'),
            require('on-tasks').injectables,
            core.workflowInjectables
        ];
        helper.setupInjector(injectables);
        servicesCore = helper.injector.get('Services.Core');
        TaskScheduler = helper.injector.get('TaskGraph.TaskScheduler');
        LeaseExpirationPoller = helper.injector.get('TaskGraph.LeaseExpirationPoller');
        taskMessenger = helper.injector.get('Task.Messenger');
        loader = helper.injector.get('TaskGraph.DataLoader');
        CompletedTaskPoller = helper.injector.get('TaskGraph.CompletedTaskPoller');
        serviceGraph = helper.injector.get('TaskGraph.ServiceGraph');
        store = helper.injector.get('TaskGraph.Store');
        taskGraphRunner = helper.injector.get('TaskGraph.Runner');
    });

    beforeEach('setup mocks', function() {
        sandbox = sinon.sandbox.create();
        sandbox.stub(servicesCore, 'start').resolves();
        sandbox.stub(servicesCore, 'stop').resolves();
        sandbox.stub(loader, 'load').resolves();
        sandbox.stub(taskMessenger, 'start').resolves();
        sandbox.stub(TaskScheduler, 'create').resolves();
        sandbox.stub(CompletedTaskPoller, 'create').resolves();
        sandbox.stub(serviceGraph, 'start').resolves();
    });

    afterEach('teardown mocks', function() {
        sandbox.restore();
    });

    describe('start method tests', function() {
        var schedulerStartStub;
        var completedTaskPollerStartStub;

        beforeEach('setup create methods', function() {
            schedulerStartStub = sinon.stub();
            completedTaskPollerStartStub = sinon.stub();
            TaskScheduler.create.returns({start: schedulerStartStub});
            CompletedTaskPoller.create.returns({start: completedTaskPollerStartStub});
        });

        it('should start a scheduler', function() {
            return taskGraphRunner.start({
                scheduler: true,
                domain: 'default'
            }).then(function() {
                expect(schedulerStartStub).to.be.called.once;
                expect(completedTaskPollerStartStub).to.be.called.once;
                expect(serviceGraph.start).to.be.called.once;
            });
        });
    });

    describe('stop method tests', function() {
        var schedulerStopStub;
        var completedTaskPollerStopStub;

        beforeEach('setup create methods', function() {
            schedulerStopStub = sinon.stub();
            completedTaskPollerStopStub = sinon.stub();
            TaskScheduler.create.returns({start: sinon.stub(), stop: schedulerStopStub});
            CompletedTaskPoller.create.returns({start: sinon.stub(),
                                                stop: completedTaskPollerStopStub});
        });

        it('should stop a scheduler', function() {
            return taskGraphRunner.start({
                scheduler: true,
                domain: 'default'
            }).then(function() {
                return taskGraphRunner.stop();
            }).then(function() {
                expect(schedulerStopStub).to.be.called.once;
                expect(completedTaskPollerStopStub).to.be.called.once;
                expect(servicesCore.stop).to.be.called.once;
            });
        });
    });
});
