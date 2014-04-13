///<reference path="Task.d.ts" />

declare module qtek {

    export module async {

        export class TaskGroup extends Task {

            all(tasks: Task[]): TaskGroup;

            allSettled(tasks: Task[]): TaskGroup;

            getFulfilledNumber(recursive?: boolean): number;

            getRejectedNumber(recursive?: boolean): number;

            getSettledNumber(recursive?: boolean): number;

            getTaskNumber(recursive?: boolean): number;
        }
    }
}