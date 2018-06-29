import {APP_BASE_HREF} from "@angular/common";
import {BrowserModule} from "@angular/platform-browser";
import {BsDropdownModule} from "ngx-bootstrap/dropdown";
import {EffectsModule} from "@ngrx/effects";
import {PopoverModule} from "ngx-bootstrap/popover";
import {StoreModule} from "@ngrx/store";
import {StoreRouterConnectingModule} from "@ngrx/router-store";

import * as AccountsReducer from "./store/reducers/accounts";
import * as ErrorsReducer from "./store/reducers/errors";
import * as OptionsReducer from "./store/reducers/options";
import {AppComponent} from "./components/app.component";
import {CoreModule} from "./+core/core.module";
import {ErrorItemComponent} from "./components/error-item.component";
import {ErrorListComponent} from "./components/error-list.component";
import {metaReducers, reducers} from "./store/reducers/root";
import {RouterProxyComponent} from "./components/router-proxy.component";
import {RoutingModule} from "./app.routing.module";

export const APP_MODULE_NG_CONF = {
    imports: [
        BrowserModule,
        RoutingModule,
        CoreModule,
        BsDropdownModule.forRoot(),
        PopoverModule.forRoot(),
        StoreModule.forRoot(reducers, {metaReducers}),
        StoreModule.forFeature(AccountsReducer.featureName, AccountsReducer.reducer),
        StoreModule.forFeature(ErrorsReducer.featureName, ErrorsReducer.reducer),
        StoreModule.forFeature(OptionsReducer.featureName, OptionsReducer.reducer),
        StoreModule.forFeature(OptionsReducer.featureName, OptionsReducer.reducer),
        StoreRouterConnectingModule,
        EffectsModule.forRoot([]),
    ],
    declarations: [
        AppComponent,
        RouterProxyComponent,
        ErrorListComponent,
        ErrorItemComponent,
    ],
    providers: [
        {provide: APP_BASE_HREF, useValue: "/"},
    ],
    bootstrap: [AppComponent],
};
