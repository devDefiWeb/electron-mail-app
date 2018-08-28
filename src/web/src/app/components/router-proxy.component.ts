import {ActivatedRoute} from "@angular/router";
import {Component, HostBinding, OnDestroy, OnInit} from "@angular/core";
import {Subject} from "rxjs";
import {filter, map, takeUntil} from "rxjs/operators";

@Component({
    selector: "email-securely-app-router-proxy",
    template: "<router-outlet></router-outlet>",
    styleUrls: ["./router-proxy.component.scss"],
})
export class RouterProxyComponent implements OnInit, OnDestroy {
    @HostBinding("class")
    outlet = "";
    unSubscribe$ = new Subject();

    constructor(private route: ActivatedRoute) {
    }

    ngOnInit() {
        this.route.data
            .pipe(
                map(({outlet}) => outlet),
                filter((outlet) => outlet),
                takeUntil(this.unSubscribe$),
            )
            .subscribe((outlet) => this.outlet = outlet);
    }

    ngOnDestroy() {
        this.unSubscribe$.next();
        this.unSubscribe$.complete();
    }
}
